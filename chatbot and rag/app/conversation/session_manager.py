from __future__ import annotations

from pathlib import Path
import sqlite3
import threading
import uuid

from app.config import settings


PROJECT_ROOT = Path(__file__).resolve().parents[2]


class SessionManager:
    """Thread-safe SQLite session history keyed by ``session_id``."""

    def __init__(
        self,
        max_messages: int | None = None,
        db_path: str | Path | None = None,
    ) -> None:
        self.max_messages = max_messages or settings.max_history_messages
        if self.max_messages <= 0:
            raise ValueError("max_messages must be positive")

        configured_path = str(db_path or settings.session_db_path).strip()
        if not configured_path:
            raise ValueError("SESSION_DB_PATH must not be empty")

        if configured_path == ":memory:":
            self.db_path = configured_path
        else:
            resolved_path = Path(configured_path)
            if not resolved_path.is_absolute():
                resolved_path = PROJECT_ROOT / resolved_path
            resolved_path.parent.mkdir(parents=True, exist_ok=True)
            self.db_path = str(resolved_path.resolve())

        self._lock = threading.RLock()
        self._connection = sqlite3.connect(
            self.db_path,
            check_same_thread=False,
            timeout=5,
        )
        self._connection.row_factory = sqlite3.Row
        self._initialize_database()

    @property
    def storage_name(self) -> str:
        return "SQLite"

    def _initialize_database(self) -> None:
        with self._lock, self._connection:
            self._connection.execute("PRAGMA foreign_keys = ON")
            self._connection.execute("PRAGMA busy_timeout = 5000")
            if self.db_path != ":memory:":
                self._connection.execute("PRAGMA journal_mode = WAL")
            self._connection.execute(
                """
                CREATE TABLE IF NOT EXISTS sessions (
                    session_id TEXT PRIMARY KEY,
                    topic TEXT,
                    intent_query TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            session_columns = {
                str(row["name"])
                for row in self._connection.execute(
                    "PRAGMA table_info(sessions)"
                ).fetchall()
            }
            if "intent_query" not in session_columns:
                self._connection.execute(
                    "ALTER TABLE sessions ADD COLUMN intent_query TEXT"
                )
            self._connection.execute(
                """
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
                    content TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
                        ON DELETE CASCADE
                )
                """
            )
            self._connection.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_messages_session_id_id
                ON messages(session_id, id)
                """
            )

    def create_session(self) -> str:
        session_id = str(uuid.uuid4())
        with self._lock, self._connection:
            self._connection.execute(
                "INSERT INTO sessions(session_id) VALUES (?)",
                (session_id,),
            )
        return session_id

    def get_history(self, session_id: str) -> list[dict[str, str]]:
        with self._lock:
            rows = self._connection.execute(
                """
                SELECT role, content
                FROM (
                    SELECT id, role, content
                    FROM messages
                    WHERE session_id = ?
                    ORDER BY id DESC
                    LIMIT ?
                )
                ORDER BY id ASC
                """,
                (session_id, self.max_messages),
            ).fetchall()
        return [
            {"role": str(row["role"]), "content": str(row["content"])}
            for row in rows
        ]

    def add_message(self, session_id: str, role: str, content: str) -> None:
        if role not in {"user", "assistant"}:
            raise ValueError("role must be 'user' or 'assistant'")
        with self._lock, self._connection:
            self._connection.execute(
                "INSERT OR IGNORE INTO sessions(session_id) VALUES (?)",
                (session_id,),
            )
            self._connection.execute(
                """
                INSERT INTO messages(session_id, role, content)
                VALUES (?, ?, ?)
                """,
                (session_id, role, content),
            )
            self._connection.execute(
                """
                DELETE FROM messages
                WHERE session_id = ?
                  AND id NOT IN (
                      SELECT id
                      FROM messages
                      WHERE session_id = ?
                      ORDER BY id DESC
                      LIMIT ?
                  )
                """,
                (session_id, session_id, self.max_messages),
            )

    def has_session(self, session_id: str) -> bool:
        with self._lock:
            row = self._connection.execute(
                "SELECT 1 FROM sessions WHERE session_id = ?",
                (session_id,),
            ).fetchone()
        return row is not None

    def get_topic(self, session_id: str) -> str | None:
        with self._lock:
            row = self._connection.execute(
                "SELECT topic FROM sessions WHERE session_id = ?",
                (session_id,),
            ).fetchone()
        if row is None or row["topic"] is None:
            return None
        return str(row["topic"])

    def set_topic(self, session_id: str, topic: str) -> None:
        cleaned_topic = topic.strip()
        if not cleaned_topic:
            return
        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT INTO sessions(session_id, topic)
                VALUES (?, ?)
                ON CONFLICT(session_id) DO UPDATE SET topic = excluded.topic
                """,
                (session_id, cleaned_topic),
            )

    def get_intent_query(self, session_id: str) -> str | None:
        with self._lock:
            row = self._connection.execute(
                "SELECT intent_query FROM sessions WHERE session_id = ?",
                (session_id,),
            ).fetchone()
        if row is None or row["intent_query"] is None:
            return None
        return str(row["intent_query"])

    def set_intent_query(self, session_id: str, intent_query: str) -> None:
        cleaned_query = intent_query.strip()
        if not cleaned_query:
            return
        with self._lock, self._connection:
            self._connection.execute(
                """
                INSERT INTO sessions(session_id, intent_query)
                VALUES (?, ?)
                ON CONFLICT(session_id)
                DO UPDATE SET intent_query = excluded.intent_query
                """,
                (session_id, cleaned_query),
            )

    def clear_session(self, session_id: str) -> None:
        with self._lock, self._connection:
            self._connection.execute(
                "DELETE FROM messages WHERE session_id = ?",
                (session_id,),
            )
            self._connection.execute(
                """
                UPDATE sessions
                SET topic = NULL, intent_query = NULL
                WHERE session_id = ?
                """,
                (session_id,),
            )

    def close(self) -> None:
        with self._lock:
            self._connection.close()
