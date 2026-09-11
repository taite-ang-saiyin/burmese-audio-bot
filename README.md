# Mingalar AI Banking Copilot

A Burmese-first banking-support copilot with text and voice input. The system combines a React web client, an authenticated FastAPI gateway, a grounded Chat/RAG service, and a speech-to-text service for Burmese and mixed Burmese-English audio.

> This is a development system. Replace the bootstrap accounts, secrets, endpoints, and demo data before any production use.

## Architecture

```text
Browser -> Frontend -> Main backend (:8000)
                           |-> Chat/RAG service (:8002) -> Retriever + Ollama/Qwen
                           `-> Speech-to-text service (:8001) -> Whisper (+ optional Gemini correction)
```

The browser communicates only with the main backend. The backend authenticates users, persists conversations and settings, and proxies narrowly scoped requests to the AI services.

## Repository layout

| Path | Purpose |
| --- | --- |
| `frontend/` | React, TypeScript, and Vite customer interface |
| `backend/` | FastAPI gateway, authentication, conversations, and SQLite persistence |
| `chatbot and rag/` | Conversation manager, retrieval adapter, and grounded Qwen/Ollama responses |
| `speech-to-text/` | FastAPI transcription service with audio preprocessing and Whisper |
| `rag_service/` | Retrieval ingestion, embedding, vector-store, and knowledge utilities |
| `deploy/` | VM/Docker deployment guidance and environment template |
| `data/` | Local development database |

## Local development

Each service has its own dependencies and environment variables. Copy each relevant `.env.example` file to `.env`, supply local credentials/endpoints, and start the services in this order:

```powershell
# Terminal 1 — speech to text
Set-Location "speech-to-text"
uvicorn app.main:app --host 0.0.0.0 --port 8001

# Terminal 2 — chat/RAG
Set-Location "chatbot and rag"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8002

# Terminal 3 — main backend
Set-Location backend
uvicorn app.main:app --reload --port 8000

# Terminal 4 — frontend
Set-Location frontend
npm install
npm run dev
```

The frontend defaults to the main backend at `http://127.0.0.1:8000/api/v1`.

## Docker deployment

The root Compose configuration starts the frontend and main backend. Create `deploy/vm.backend.env` from `deploy/vm.backend.env.example`, set production values, then run:

```powershell
docker compose up --build
```

The Chat/RAG and STT services are expected to be reachable at the URLs configured in the backend environment.

## Documentation

- [Integrated local runbook](INTEGRATION.md)
- [System architecture and API overview](SYSTEM_OVERVIEW.md)
- [Backend documentation](backend/README.md)
- [Chat/RAG documentation](chatbot%20and%20rag/README.md)
- [Speech-to-text documentation](speech-to-text/README.md)

## Security notes

- Do not commit `.env` files, API keys, model caches, or customer data.
- Use unique strong production secrets and replace all development bootstrap accounts.
- Keep the retriever, language model, and speech services on a private network or behind authenticated service boundaries.
