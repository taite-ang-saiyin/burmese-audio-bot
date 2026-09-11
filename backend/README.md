# Mingalar Banking API

Standalone FastAPI backend for the banking copilot frontend. It owns application data and access control; it intentionally does **not** implement RAG, chatbot, TTS, or STT behavior. Those are configured as external HTTP APIs and are only proxied through authenticated routes.

## Included

- Session-based authentication with password hashing and role authorization
- SQLite persistence for conversations, messages, saved answers, feedback, preferences, knowledge-document metadata, and inquiry telemetry
- Staff/admin knowledge and analytics APIs
- Explicit, timeout-bound proxy endpoints for external chat, TTS, and STT services
- CORS, request IDs, response-time headers, input validation, and health checks

## Run locally

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The development bootstrap users are `admin@mingalarbank.com`, `staff@mingalarbank.com`, and `customer@mingalarbank.com`; each password is `ChangeMe123!`. Remove or replace them before production.

The OpenAPI documentation is at `http://localhost:8000/docs`.

## External API configuration

Set the service URLs in `.env` to the exact upstream endpoint URL. For the
services included in this repository, use `CHAT_SERVICE_URL=http://127.0.0.1:8002/chat`
and `STT_SERVICE_URL=http://127.0.0.1:8001/api/v1/transcribe`. Leave
`TTS_SERVICE_URL` blank until the TTS service is supplied. The proxy routes are:

- `POST /api/v1/integrations/chat/respond`
- `POST /api/v1/integrations/tts`
- `POST /api/v1/integrations/stt` (JSON-compatible STT API)
- `POST /api/v1/integrations/stt/transcribe` (multipart audio upload; compatible with the cloned `speech-to-text` service)

If a URL is not configured, its route returns `503 external_service_unavailable`. This makes incomplete integrations visible instead of substituting mock AI behavior.

`/integrations/chat/respond` accepts the application conversation id for access
control plus the optional RAG session UUID. Only `message` and that UUID are
sent onward to the Conversation Manager, whose `/chat` contract owns RAG
history. Multipart voice uploads are forwarded without being persisted; the
frontend submits `data.final_transcript` only after the customer reviews it.

## Verification

```powershell
cd backend
pytest
```
