import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv(override=True)


def _as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    retriever_backend: str = os.getenv("RETRIEVER_BACKEND", "mock").strip().lower()
    person1_rag_url: str = os.getenv(
        "PERSON1_RAG_URL", "http://192.168.48.192:8000/api/v1/retrieve"
    ).strip()
    person1_rag_api_key: str = os.getenv("PERSON1_RAG_API_KEY", "").strip()
    person1_rag_top_k: int = int(os.getenv("PERSON1_RAG_TOP_K", "3"))
    person1_rag_timeout_seconds: int = int(
        os.getenv("PERSON1_RAG_TIMEOUT_SECONDS", "30")
    )
    llm_backend: str = os.getenv("LLM_BACKEND", "ollama").strip().lower()
    google_cloud_project: str = (os.getenv("GOOGLE_CLOUD_PROJECT") or "tinyeqn-staging").strip()
    google_cloud_location: str = os.getenv("GOOGLE_CLOUD_LOCATION", "global").strip()
    gemini_model_name: str = os.getenv("GEMINI_MODEL_NAME", "gemini-3.6-flash").strip()
    ollama_model_name: str = os.getenv(
        "OLLAMA_MODEL_NAME", "qwen3:4b-instruct-2507-q4_K_M"
    )
    ollama_base_url: str = os.getenv(
        "OLLAMA_BASE_URL", "http://127.0.0.1:11434"
    ).rstrip("/")
    ollama_timeout_seconds: int = int(os.getenv("OLLAMA_TIMEOUT_SECONDS", "300"))
    ollama_keep_alive: str = os.getenv("OLLAMA_KEEP_ALIVE", "1h")
    ollama_context_length: int = int(os.getenv("OLLAMA_CONTEXT_LENGTH", "4096"))
    ollama_num_gpu: int | None = (
        int(os.environ["OLLAMA_NUM_GPU"])
        if os.getenv("OLLAMA_NUM_GPU") not in (None, "")
        else None
    )
    transformers_model_name: str = os.getenv(
        "TRANSFORMERS_MODEL_NAME", "Qwen/Qwen3-4B-Instruct-2507"
    )
    transformers_model_name: str = os.getenv(
        "TRANSFORMERS_MODEL_NAME", "Qwen/Qwen3-4B-Instruct-2507"
    )
    use_4bit: bool = _as_bool(os.getenv("USE_4BIT"), True)
    max_history_messages: int = int(os.getenv("MAX_HISTORY_MESSAGES", "6"))
    session_db_path: str = os.getenv(
        "SESSION_DB_PATH", "data/session_history.sqlite3"
    ).strip()
    max_new_tokens: int = int(os.getenv("MAX_NEW_TOKENS", "512"))
    enable_query_rewrite: bool = _as_bool(os.getenv("ENABLE_QUERY_REWRITE"), True)
    enable_answer_validation: bool = _as_bool(
        os.getenv("ENABLE_ANSWER_VALIDATION"), True
    )
    log_rejected_answers: bool = _as_bool(
        os.getenv("LOG_REJECTED_ANSWERS"), True
    )


settings = Settings()
