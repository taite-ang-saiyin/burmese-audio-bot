from __future__ import annotations

import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import time
import uuid
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any, Literal

import httpx
from fastapi import Depends, FastAPI, File, HTTPException, Request, Response, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field


def now() -> datetime:
    return datetime.now(UTC)


def iso(value: datetime | None = None) -> str:
    return (value or now()).isoformat().replace("+00:00", "Z")


@dataclass(frozen=True)
class Settings:
    app_name: str
    database_path: Path
    cors_origins: list[str]
    session_secret: str
    session_ttl_hours: int
    chat_service_url: str
    tts_service_url: str
    stt_service_url: str
    request_timeout_seconds: float

    @classmethod
    def from_environment(cls) -> "Settings":
        root = Path(__file__).resolve().parents[2]
        configured_path = Path(os.getenv("DATABASE_PATH", "./data/banking.db"))
        database_path = configured_path if configured_path.is_absolute() else root / configured_path
        origins = [value.strip() for value in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",") if value.strip()]
        return cls(
            app_name=os.getenv("APP_NAME", "Mingalar Banking API"),
            database_path=database_path,
            cors_origins=origins,
            session_secret=os.getenv("SESSION_SECRET", "development-only-change-me"),
            session_ttl_hours=int(os.getenv("SESSION_TTL_HOURS", "24")),
            chat_service_url=os.getenv("CHAT_SERVICE_URL", "").rstrip("/"),
            tts_service_url=os.getenv("TTS_SERVICE_URL", "").rstrip("/"),
            stt_service_url=os.getenv("STT_SERVICE_URL", "").rstrip("/"),
            request_timeout_seconds=float(os.getenv("REQUEST_TIMEOUT_SECONDS", "20")),
        )


def load_local_env() -> None:
    """Load backend/.env without overriding environment supplied by the host."""
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.exists():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_local_env()
settings = Settings.from_environment()


def connection() -> sqlite3.Connection:
    settings.database_path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(settings.database_path)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON")
    return db


SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('customer','staff','admin')),
  password_hash TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferences TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'General', created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('user','assistant','system')), content TEXT NOT NULL,
  is_voice INTEGER NOT NULL DEFAULT 0, is_saved INTEGER NOT NULL DEFAULT 0,
  metadata TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, title_mm TEXT NOT NULL, category TEXT NOT NULL,
  document_type TEXT NOT NULL, version TEXT NOT NULL, status TEXT NOT NULL,
  content TEXT NOT NULL, keywords TEXT NOT NULL DEFAULT '[]', created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY, message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, helpful INTEGER NOT NULL,
  reason TEXT, comment TEXT, created_at TEXT NOT NULL,
  UNIQUE(message_id, user_id)
);
CREATE TABLE IF NOT EXISTS inquiry_events (
  id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL, query TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General', is_voice INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', latency_ms INTEGER, created_at TEXT NOT NULL
);
"""


def password_hash(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 310_000)
    return f"{salt.hex()}${digest.hex()}"


def password_matches(password: str, stored: str) -> bool:
    try:
        salt_hex, expected = stored.split("$", 1)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt_hex), 310_000).hex()
        return hmac.compare_digest(actual, expected)
    except (ValueError, AttributeError):
        return False


def initialise_database() -> None:
    with connection() as db:
        db.executescript(SCHEMA)
        if db.execute("SELECT 1 FROM users LIMIT 1").fetchone() is None:
            # Development accounts are intentional bootstrap data. Change or remove before production.
            seeds = [
                ("usr_admin_01", "Operations Admin", "admin@mingalarbank.com", "admin"),
                ("usr_staff_01", "Customer Support Officer", "staff@mingalarbank.com", "staff"),
                ("usr_customer_01", "Demo Customer", "customer@mingalarbank.com", "customer"),
            ]
            for user_id, name, email, role in seeds:
                db.execute(
                    "INSERT INTO users VALUES (?, ?, ?, ?, ?, ?)",
                    (user_id, name, email, role, password_hash("ChangeMe123!"), iso()),
                )


class APIModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class LoginRequest(APIModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=8, max_length=256)


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: Literal["customer", "staff", "admin"]


class AuthResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_at: str
    user: UserResponse


class Preferences(APIModel):
    personality: Literal["friendly", "calm", "professional"] = "friendly"
    speed: float = Field(default=1.0, ge=0.5, le=2.0)
    auto_speak: bool = True
    dialect: Literal["standard", "yangon", "mandalay"] = "standard"
    large_font: bool = False
    high_contrast: bool = False
    show_keyboard_hints: bool = True


class ConversationCreate(APIModel):
    title: str = Field(default="New conversation", min_length=1, max_length=160)
    category: str = Field(default="General", min_length=1, max_length=60)


class MessageCreate(APIModel):
    role: Literal["user", "assistant", "system"]
    content: str = Field(min_length=1, max_length=20_000)
    is_voice: bool = False
    metadata: dict[str, Any] = Field(default_factory=dict)


class KnowledgeDocumentCreate(APIModel):
    title: str = Field(min_length=1, max_length=240)
    title_mm: str = Field(min_length=1, max_length=240)
    category: str = Field(min_length=1, max_length=60)
    document_type: Literal["Policy", "Procedure", "FAQ", "Circular", "Manual"]
    version: str = Field(min_length=1, max_length=40)
    content: str = Field(min_length=1, max_length=100_000)
    keywords: list[str] = Field(default_factory=list, max_length=50)


class FeedbackCreate(APIModel):
    helpful: bool
    reason: str | None = Field(default=None, max_length=80)
    comment: str | None = Field(default=None, max_length=2_000)


class AssistantRequest(APIModel):
    message: str = Field(min_length=1, max_length=20_000)
    conversation_id: str | None = None
    # The RAG service owns its own short-term conversation history.  This UUID
    # is returned by that service and is intentionally separate from our
    # database conversation id.
    rag_session_id: uuid.UUID | None = None
    is_voice: bool = False


def user_response(row: sqlite3.Row) -> dict[str, str]:
    return {"id": row["id"], "name": row["name"], "email": row["email"], "role": row["role"]}


def create_session(user_id: str) -> tuple[str, str]:
    raw_token = secrets.token_urlsafe(32)
    expires = now() + timedelta(hours=settings.session_ttl_hours)
    with connection() as db:
        db.execute(
            "INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
            (hashlib.sha256(raw_token.encode()).hexdigest(), user_id, iso(expires), iso()),
        )
    return raw_token, iso(expires)


def current_user(request: Request) -> sqlite3.Row:
    authorization = request.headers.get("Authorization", "")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    token_hash = hashlib.sha256(authorization.removeprefix("Bearer ").encode()).hexdigest()
    with connection() as db:
        row = db.execute(
            "SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id "
            "WHERE sessions.token_hash = ? AND sessions.expires_at > ?",
            (token_hash, iso()),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session")
    return row


def require_roles(*roles: str):
    def dependency(user: sqlite3.Row = Depends(current_user)) -> sqlite3.Row:
        if user["role"] not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user
    return dependency


def conversation_for_user(conversation_id: str, user_id: str) -> sqlite3.Row:
    with connection() as db:
        row = db.execute("SELECT * FROM conversations WHERE id = ? AND user_id = ?", (conversation_id, user_id)).fetchone()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return row


async def proxy(service_name: str, service_url: str, request: Request, payload: dict[str, Any]) -> Any:
    if not service_url:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "external_service_unavailable", "service": service_name, "message": f"{service_name} is not configured"},
        )
    try:
        async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
            result = await client.post(service_url, json=payload, headers={"X-Request-ID": request.state.request_id})
        content_type = result.headers.get("content-type", "")
        if "application/json" in content_type:
            body: Any = result.json()
        else:
            body = {"content": result.text}
        if result.is_error:
            raise HTTPException(status_code=502, detail={"code": "external_service_error", "service": service_name, "upstream_status": result.status_code, "body": body})
        if content_type.startswith("audio/"):
            return Response(
                content=result.content,
                media_type=content_type,
                headers={
                    "Content-Disposition": result.headers.get("content-disposition", "inline"),
                },
            )
        return body
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail={"code": "external_service_error", "service": service_name, "message": str(exc)}) from exc


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialise_database()
    yield


app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)


@app.middleware("http")
async def request_context(request: Request, call_next):
    request.state.request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    started = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Request-ID"] = request.state.request_id
    response.headers["X-Response-Time-Ms"] = str(round((time.perf_counter() - started) * 1000))
    return response


@app.get("/api/v1/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "service": settings.app_name, "time": iso()}


@app.post("/api/v1/auth/login", response_model=AuthResponse)
def login(payload: LoginRequest) -> dict[str, Any]:
    with connection() as db:
        user = db.execute("SELECT * FROM users WHERE lower(email) = lower(?)", (payload.email.strip(),)).fetchone()
    if user is None or not password_matches(payload.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    token, expires_at = create_session(user["id"])
    return {"access_token": token, "expires_at": expires_at, "user": user_response(user)}


@app.post("/api/v1/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, _: sqlite3.Row = Depends(current_user)) -> Response:
    token_hash = hashlib.sha256(request.headers["Authorization"].removeprefix("Bearer ").encode()).hexdigest()
    with connection() as db:
        db.execute("DELETE FROM sessions WHERE token_hash = ?", (token_hash,))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get("/api/v1/auth/me", response_model=UserResponse)
def me(user: sqlite3.Row = Depends(current_user)) -> dict[str, str]:
    return user_response(user)


@app.get("/api/v1/preferences", response_model=Preferences)
def get_preferences(user: sqlite3.Row = Depends(current_user)) -> dict[str, Any]:
    with connection() as db:
        row = db.execute("SELECT preferences FROM user_settings WHERE user_id = ?", (user["id"],)).fetchone()
    return json.loads(row["preferences"]) if row else Preferences().model_dump()


@app.put("/api/v1/preferences", response_model=Preferences)
def update_preferences(payload: Preferences, user: sqlite3.Row = Depends(current_user)) -> dict[str, Any]:
    data = payload.model_dump()
    with connection() as db:
        db.execute(
            "INSERT INTO user_settings (user_id, preferences, updated_at) VALUES (?, ?, ?) "
            "ON CONFLICT(user_id) DO UPDATE SET preferences=excluded.preferences, updated_at=excluded.updated_at",
            (user["id"], json.dumps(data), iso()),
        )
    return data


@app.get("/api/v1/conversations")
def list_conversations(user: sqlite3.Row = Depends(current_user)) -> dict[str, list[dict[str, Any]]]:
    with connection() as db:
        rows = db.execute(
            "SELECT c.*, COUNT(m.id) AS message_count FROM conversations c LEFT JOIN messages m ON m.conversation_id=c.id "
            "WHERE c.user_id=? GROUP BY c.id ORDER BY c.updated_at DESC", (user["id"],)
        ).fetchall()
    return {"items": [dict(row) for row in rows]}


@app.post("/api/v1/conversations", status_code=status.HTTP_201_CREATED)
def create_conversation(payload: ConversationCreate, user: sqlite3.Row = Depends(current_user)) -> dict[str, Any]:
    item = {"id": f"conv_{uuid.uuid4().hex}", "user_id": user["id"], "title": payload.title, "category": payload.category, "created_at": iso(), "updated_at": iso()}
    with connection() as db:
        db.execute("INSERT INTO conversations VALUES (:id, :user_id, :title, :category, :created_at, :updated_at)", item)
    return item


@app.get("/api/v1/conversations/{conversation_id}")
def get_conversation(conversation_id: str, user: sqlite3.Row = Depends(current_user)) -> dict[str, Any]:
    conversation = conversation_for_user(conversation_id, user["id"])
    with connection() as db:
        messages = db.execute("SELECT * FROM messages WHERE conversation_id=? ORDER BY created_at", (conversation_id,)).fetchall()
    item = dict(conversation)
    item["messages"] = [{**dict(message), "is_voice": bool(message["is_voice"]), "is_saved": bool(message["is_saved"]), "metadata": json.loads(message["metadata"])} for message in messages]
    return item


@app.delete("/api/v1/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(conversation_id: str, user: sqlite3.Row = Depends(current_user)) -> Response:
    conversation_for_user(conversation_id, user["id"])
    with connection() as db:
        db.execute("DELETE FROM conversations WHERE id=?", (conversation_id,))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.post("/api/v1/conversations/{conversation_id}/messages", status_code=status.HTTP_201_CREATED)
def add_message(conversation_id: str, payload: MessageCreate, user: sqlite3.Row = Depends(current_user)) -> dict[str, Any]:
    conversation_for_user(conversation_id, user["id"])
    item = {"id": f"msg_{uuid.uuid4().hex}", "conversation_id": conversation_id, "role": payload.role, "content": payload.content, "is_voice": int(payload.is_voice), "is_saved": 0, "metadata": json.dumps(payload.metadata), "created_at": iso()}
    with connection() as db:
        db.execute("INSERT INTO messages VALUES (:id, :conversation_id, :role, :content, :is_voice, :is_saved, :metadata, :created_at)", item)
        db.execute("UPDATE conversations SET updated_at=? WHERE id=?", (item["created_at"], conversation_id))
    return {**item, "is_voice": bool(item["is_voice"]), "is_saved": False, "metadata": payload.metadata}


@app.patch("/api/v1/messages/{message_id}/saved")
def toggle_saved(message_id: str, user: sqlite3.Row = Depends(current_user)) -> dict[str, bool]:
    with connection() as db:
        message = db.execute("SELECT m.* FROM messages m JOIN conversations c ON c.id=m.conversation_id WHERE m.id=? AND c.user_id=?", (message_id, user["id"])).fetchone()
        if message is None:
            raise HTTPException(status_code=404, detail="Message not found")
        is_saved = not bool(message["is_saved"])
        db.execute("UPDATE messages SET is_saved=? WHERE id=?", (int(is_saved), message_id))
    return {"is_saved": is_saved}


@app.get("/api/v1/messages/saved")
def saved_messages(user: sqlite3.Row = Depends(current_user)) -> dict[str, list[dict[str, Any]]]:
    with connection() as db:
        rows = db.execute("SELECT m.* FROM messages m JOIN conversations c ON c.id=m.conversation_id WHERE c.user_id=? AND m.is_saved=1 ORDER BY m.created_at DESC", (user["id"],)).fetchall()
    return {"items": [{**dict(row), "is_voice": bool(row["is_voice"]), "is_saved": True, "metadata": json.loads(row["metadata"])} for row in rows]}


@app.post("/api/v1/messages/{message_id}/feedback", status_code=status.HTTP_201_CREATED)
def submit_feedback(message_id: str, payload: FeedbackCreate, user: sqlite3.Row = Depends(current_user)) -> dict[str, str]:
    with connection() as db:
        message = db.execute("SELECT m.id FROM messages m JOIN conversations c ON c.id=m.conversation_id WHERE m.id=? AND c.user_id=?", (message_id, user["id"])).fetchone()
        if message is None:
            raise HTTPException(status_code=404, detail="Message not found")
        db.execute(
            "INSERT INTO feedback (id,message_id,user_id,helpful,reason,comment,created_at) VALUES (?,?,?,?,?,?,?) "
            "ON CONFLICT(message_id,user_id) DO UPDATE SET helpful=excluded.helpful,reason=excluded.reason,comment=excluded.comment,created_at=excluded.created_at",
            (f"feedback_{uuid.uuid4().hex}", message_id, user["id"], int(payload.helpful), payload.reason, payload.comment, iso()),
        )
    return {"status": "recorded"}


@app.get("/api/v1/knowledge")
def list_knowledge(_: sqlite3.Row = Depends(require_roles("staff", "admin"))) -> dict[str, list[dict[str, Any]]]:
    with connection() as db:
        rows = db.execute("SELECT * FROM knowledge_documents ORDER BY updated_at DESC").fetchall()
    return {"items": [{**dict(row), "keywords": json.loads(row["keywords"])} for row in rows]}


@app.post("/api/v1/knowledge", status_code=status.HTTP_201_CREATED)
def create_knowledge(payload: KnowledgeDocumentCreate, user: sqlite3.Row = Depends(require_roles("staff", "admin"))) -> dict[str, Any]:
    item = {"id": f"doc_{uuid.uuid4().hex}", "title": payload.title, "title_mm": payload.title_mm, "category": payload.category, "document_type": payload.document_type, "version": payload.version, "status": "Pending external indexing", "content": payload.content, "keywords": json.dumps(payload.keywords), "created_by": user["id"], "created_at": iso(), "updated_at": iso()}
    with connection() as db:
        db.execute("INSERT INTO knowledge_documents VALUES (:id,:title,:title_mm,:category,:document_type,:version,:status,:content,:keywords,:created_by,:created_at,:updated_at)", item)
    return {**item, "keywords": payload.keywords}


@app.delete("/api/v1/knowledge/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_knowledge(document_id: str, _: sqlite3.Row = Depends(require_roles("admin"))) -> Response:
    with connection() as db:
        exists = db.execute("SELECT 1 FROM knowledge_documents WHERE id=?", (document_id,)).fetchone()
        if exists is None:
            raise HTTPException(status_code=404, detail="Knowledge document not found")
        db.execute("DELETE FROM knowledge_documents WHERE id=?", (document_id,))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get("/api/v1/analytics/summary")
def analytics(_: sqlite3.Row = Depends(require_roles("staff", "admin"))) -> dict[str, Any]:
    today = now().date().isoformat()
    with connection() as db:
        total = db.execute("SELECT COUNT(*) FROM inquiry_events WHERE created_at >= ?", (today,)).fetchone()[0]
        voice = db.execute("SELECT COUNT(*) FROM inquiry_events WHERE created_at >= ? AND is_voice=1", (today,)).fetchone()[0]
        avg = db.execute("SELECT AVG(latency_ms) FROM inquiry_events WHERE created_at >= ? AND latency_ms IS NOT NULL", (today,)).fetchone()[0]
        helpful = db.execute("SELECT AVG(helpful) FROM feedback").fetchone()[0]
        events = db.execute("SELECT id, query, category, is_voice, status, latency_ms, created_at FROM inquiry_events ORDER BY created_at DESC LIMIT 50").fetchall()
    return {"total_queries_today": total, "voice_queries_rate": round(voice / total * 100, 1) if total else 0, "avg_response_time_ms": round(avg or 0), "helpful_rate": round((helpful or 0) * 100, 1), "recent_inquiries": [{**dict(row), "is_voice": bool(row["is_voice"])} for row in events]}


@app.get("/api/v1/integrations")
def integration_status(_: sqlite3.Row = Depends(require_roles("staff", "admin"))) -> dict[str, dict[str, bool]]:
    return {"chat": {"configured": bool(settings.chat_service_url)}, "tts": {"configured": bool(settings.tts_service_url)}, "stt": {"configured": bool(settings.stt_service_url)}}


@app.post("/api/v1/integrations/chat/respond")
async def assistant_response(payload: AssistantRequest, request: Request, user: sqlite3.Row = Depends(current_user)) -> Any:
    if payload.conversation_id:
        conversation_for_user(payload.conversation_id, user["id"])
    event_id = f"inq_{uuid.uuid4().hex}"
    started = time.perf_counter()
    with connection() as db:
        db.execute("INSERT INTO inquiry_events (id,user_id,conversation_id,query,is_voice,status,created_at) VALUES (?,?,?,?,?,?,?)", (event_id, user["id"], payload.conversation_id, payload.message, int(payload.is_voice), "pending", iso()))
    try:
        # The conversation manager has a deliberately narrow public contract:
        # it accepts only the message and its own optional UUID.  Do not leak
        # application-specific conversation metadata into that contract.
        chat_payload: dict[str, Any] = {"message": payload.message}
        if payload.rag_session_id is not None:
            chat_payload["session_id"] = str(payload.rag_session_id)
        result = await proxy("chat", settings.chat_service_url, request, chat_payload)
        with connection() as db:
            db.execute("UPDATE inquiry_events SET status='completed', latency_ms=? WHERE id=?", (round((time.perf_counter() - started) * 1000), event_id))
        return result
    except HTTPException:
        with connection() as db:
            db.execute("UPDATE inquiry_events SET status='failed', latency_ms=? WHERE id=?", (round((time.perf_counter() - started) * 1000), event_id))
        raise


@app.post("/api/v1/integrations/tts")
async def tts_proxy(payload: dict[str, Any], request: Request, _: sqlite3.Row = Depends(current_user)) -> Any:
    return await proxy("tts", settings.tts_service_url, request, payload)


@app.post("/api/v1/integrations/stt")
async def stt_proxy(payload: dict[str, Any], request: Request, _: sqlite3.Row = Depends(current_user)) -> Any:
    return await proxy("stt", settings.stt_service_url, request, payload)


@app.post("/api/v1/integrations/stt/transcribe")
async def transcribe_audio(
    request: Request,
    file: UploadFile = File(...),
    _: sqlite3.Row = Depends(current_user),
) -> Any:
    """Pass audio through to the separately deployed STT service without storing it."""
    if not settings.stt_service_url:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "external_service_unavailable", "service": "stt", "message": "stt is not configured"},
        )
    try:
        content = await file.read()
        async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
            result = await client.post(
                settings.stt_service_url,
                files={"file": (file.filename or "audio", content, file.content_type or "application/octet-stream")},
                headers={"X-Request-ID": request.state.request_id},
            )
        body = result.json() if "application/json" in result.headers.get("content-type", "") else {"content": result.text}
        if result.is_error:
            raise HTTPException(status_code=502, detail={"code": "external_service_error", "service": "stt", "upstream_status": result.status_code, "body": body})
        return body
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail={"code": "external_service_error", "service": "stt", "message": str(exc)}) from exc
