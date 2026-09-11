from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.conversation.query_rewriter import QueryRewriter
from app.conversation.session_manager import SessionManager
from app.llm.ollama_service import OllamaService
from app.retrieval.retrieval_client import MockRetriever, Person1HTTPRetriever
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat_service import ChatService


app = FastAPI(title="Person 2 - Qwen RAG Conversation Manager", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _build_llm_service():
    if settings.llm_backend == "ollama":
        return OllamaService()
    if settings.llm_backend == "gemini":
        from app.llm.gemini_service import GeminiService

        return GeminiService()
    if settings.llm_backend == "transformers":
        # Keep the expensive Torch/Transformers import out of the normal
        # CPU-only Ollama startup path.
        from app.llm.qwen_service import QwenService

        return QwenService()
    raise ValueError(
        f"Unsupported LLM_BACKEND={settings.llm_backend!r}. "
        "Use 'ollama', 'gemini', or 'transformers'."
    )


def _build_retriever():
    if settings.retriever_backend == "mock":
        return MockRetriever()
    if settings.retriever_backend == "person1":
        return Person1HTTPRetriever(
            endpoint_url=settings.person1_rag_url,
            service_token=settings.person1_rag_api_key,
            top_k=settings.person1_rag_top_k,
            timeout_seconds=settings.person1_rag_timeout_seconds,
        )
    raise ValueError(
        f"Unsupported RETRIEVER_BACKEND={settings.retriever_backend!r}. "
        "Use 'mock' or 'person1'."
    )


llm_service = _build_llm_service()
session_manager = SessionManager()
retriever = _build_retriever()
query_rewriter = QueryRewriter(llm_service)
chat_service = ChatService(
    llm=llm_service,
    retriever=retriever,
    session_manager=session_manager,
    query_rewriter=query_rewriter,
)


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "backend": settings.llm_backend,
        "model": llm_service.model_name,
        "model_loaded": llm_service.is_loaded,
        "retriever": retriever.__class__.__name__,
        "history_store": session_manager.storage_name,
        "history_messages": session_manager.max_messages,
    }


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> dict:
    session_id = str(request.session_id) if request.session_id else None
    try:
        return chat_service.chat(message=request.message, session_id=session_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
