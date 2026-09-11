# Mingalar AI Banking Copilot — System Overview

## Purpose

This repository implements a banking-support copilot with text and voice input. It is designed for Burmese and mixed Burmese-English customer questions. The public application persists customer-facing data and access control in a main backend, while model-heavy services run separately:

- **Chat/RAG service**: retrieves banking-policy context from an external Person 1 retriever and uses a local Qwen model to generate grounded Burmese answers.
- **Speech-to-text (STT) service**: turns an uploaded recording into a reviewed Burmese/mixed-language transcript.
- **TTS**: a gateway route exists, but no TTS microservice is included or connected; the browser currently uses its existing speech playback adapter.

## Architecture

```text
                         private LAN / VPN
                         ┌───────────────────────────────────────────────┐
Browser                 │ Model computer                                │
  │                      │                                               │
  │ HTTPS / same origin  │  Chat/RAG :8002 ──► Person 1 retriever :8000 │
  ▼                      │       │                                       │
Frontend (React/Nginx)  │       └────────────► Ollama :11434 (local)    │
  │ /api/v1             │                                               │
  ▼                      │  STT :8001 ──► Whisper + optional Gemini     │
Main FastAPI backend    │                                               │
  │ :8000               └───────────────────────────────────────────────┘
  └── SQLite data
```

The browser calls only the main backend. The backend authenticates the user, authorizes access to the specified conversation, persists application data, and proxies narrowly scoped requests to Chat/RAG, STT, and a future TTS service. It does not itself implement RAG, ASR, TTS, or answer generation.

### Request flows

**Text**

```text
Customer message → frontend saves user message → backend /integrations/chat/respond
→ Chat/RAG /chat → external retriever → Qwen/fallback → response with sources
→ frontend saves assistant message, sources, grounding state, and RAG session UUID
```

**Voice**

```text
Microphone recording → frontend → backend multipart STT proxy → STT /api/v1/transcribe
→ validation/preprocessing/Whisper/correction → reviewed final transcript
→ same text flow as above
```

Audio is forwarded to STT but is not persisted by the main backend. The customer must confirm the transcript before it is sent to Chat/RAG. Text queries and confirmed transcripts are persisted.

## Repository layout

| Path | Responsibility |
| --- | --- |
| `frontend/` | React 19/Vite client, user interface, microphone capture, browser speech playback, authenticated API client |
| `backend/` | Main FastAPI application, SQLite, authentication/roles, conversation and staff APIs, upstream proxying |
| `chatbot and rag/` | FastAPI Conversation Manager, session history, query rewrite, retrieval adapter, Qwen/Ollama generation and safety validation |
| `speech-to-text/` | FastAPI audio-transcription microservice, audio processing, Whisper, optional Gemini correction |
| `deploy/` | Docker/VM deployment environment template and operational guidance |
| `data/banking.db` | Local SQLite application database (runtime/generated data) |
| `INTEGRATION.md` | Compact integrated local runbook |
| `docker-compose.yml` | VM-style frontend + backend Compose stack |

## Frontend

### Stack and execution

- React 19, TypeScript, Vite 6, Tailwind CSS 4, Motion, and Lucide icons.
- `src/main.tsx` mounts `AppIntegrated.tsx`, which is the active app shell.
- The configured API base is `VITE_API_BASE_URL`, defaulting to `http://127.0.0.1:8000/api/v1`. In the Docker deployment it is `/api/v1` on the same origin.
- The bearer token is stored in browser `localStorage` under `mingalar-banking-access-token` and is attached to API calls.

### User capabilities

- Login or development one-click customer login.
- Create, list, open, and delete conversations.
- Send text or microphone input; inspect and confirm/re-record/cancel a transcript.
- View RAG sources and grounding state; save answers and send feedback.
- Voice workspace with listening, generating, speaking, replay/pause/resume/stop controls.
- Settings for personality, speed, auto-speak, dialect, large font, high contrast, and keyboard hints.
- History, saved answers, staff knowledge-management, and admin/analytics views are represented in the client.
- A client-side sensitive-data scan masks detected values for display. It is a UX safeguard, not a substitute for server-side data-loss prevention.

After receiving a RAG response, the client stores its `session_id` in the assistant message metadata and reuses it for the next turn. This lets the RAG service retain short-term context across a browser reload without sending the frontend's full conversation history upstream.

### Important legacy/demo component

`frontend/server.ts` is an older standalone Express/Gemini/mock-RAG server with endpoints such as `/api/chat`, `/api/stt`, and `/api/tts`. It is **not** the production integration path: the active frontend API client uses `/api/v1` on the FastAPI backend. Do not deploy its seeded answers, demo hotline figures, or Gemini path as authoritative banking behavior.

## Main backend (`backend/`)

### Responsibilities

- FastAPI 1.0 application with CORS, request IDs (`X-Request-ID`), and response-time headers (`X-Response-Time-Ms`).
- SQLite persistence and initial development-user seeding.
- Bearer-token sessions. Tokens are generated securely, only SHA-256 hashes are stored, and sessions expire after `SESSION_TTL_HOURS` (24 by default).
- Passwords use PBKDF2-HMAC-SHA256 with a random 16-byte salt and 310,000 iterations.
- Customer data ownership checks on conversation/message operations and role checks for staff/admin APIs.
- Bounded HTTP proxy calls with a configurable timeout. Missing external endpoints produce `503 external_service_unavailable`; upstream failures are exposed as `502 external_service_error`.

### Data model

The backend creates these SQLite tables:

| Table | Stored data |
| --- | --- |
| `users` | user profile, role, password hash |
| `sessions` | hashed session token and expiry |
| `user_settings` | serialized display/voice preferences |
| `conversations` | customer-owned conversation metadata |
| `messages` | user/assistant/system content, voice and saved flags, JSON metadata |
| `knowledge_documents` | staff-entered policy/document metadata and content |
| `feedback` | one updatable feedback record per user/message |
| `inquiry_events` | query telemetry, voice flag, status, latency, and conversation link |

The application-level conversation ID is separate from the Chat/RAG `session_id` UUID. The former controls ownership and persistence; the latter controls RAG short-term history.

### Roles and development users

Roles are `customer`, `staff`, and `admin`.

On an empty database, the app seeds `admin@mingalarbank.com`, `staff@mingalarbank.com`, and `customer@mingalarbank.com`, all with password `ChangeMe123!`. These are development bootstrap accounts and must be removed or replaced before any production use.

### HTTP API

All routes below are under `/api/v1`; all except health/login require a bearer token unless stated otherwise.

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | public | service status and UTC time |
| POST | `/auth/login` | public | obtain bearer token and user |
| POST | `/auth/logout` | authenticated | revoke current token |
| GET | `/auth/me` | authenticated | current user |
| GET/PUT | `/preferences` | authenticated | read/update user preferences |
| GET/POST | `/conversations` | authenticated | list/create own conversations |
| GET/DELETE | `/conversations/{id}` | owner | read/delete one conversation |
| POST | `/conversations/{id}/messages` | owner | persist a message |
| PATCH | `/messages/{id}/saved` | message owner | toggle saved state |
| GET | `/messages/saved` | authenticated | list own saved messages |
| POST | `/messages/{id}/feedback` | message owner | create/update feedback |
| GET/POST | `/knowledge` | staff or admin | list/create document records |
| DELETE | `/knowledge/{id}` | admin | delete a document record |
| GET | `/analytics/summary` | staff or admin | telemetry and feedback aggregate |
| GET | `/integrations` | staff or admin | tells whether chat/TTS/STT URLs are configured |
| POST | `/integrations/chat/respond` | authenticated | proxy message and optional RAG session UUID to Chat/RAG |
| POST | `/integrations/tts` | authenticated | generic JSON proxy to a future TTS endpoint |
| POST | `/integrations/stt` | authenticated | generic JSON proxy to an STT endpoint |
| POST | `/integrations/stt/transcribe` | authenticated | multipart `file` proxy to the included STT service |

Knowledge documents created here are marked `Pending external indexing`; this repository does not automatically push them into Person 1's retrieval index.

### Backend configuration

| Variable | Default / use |
| --- | --- |
| `APP_NAME` | `Mingalar Banking API` |
| `DATABASE_PATH` | `./data/banking.db` |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:5173` |
| `SESSION_SECRET` | development-only default; set a strong unique value in production |
| `SESSION_TTL_HOURS` | `24` |
| `CHAT_SERVICE_URL` | Chat/RAG `/chat`, commonly `http://127.0.0.1:8002/chat` |
| `STT_SERVICE_URL` | STT `/api/v1/transcribe`, commonly `http://127.0.0.1:8001/api/v1/transcribe` |
| `TTS_SERVICE_URL` | blank until an external TTS service is supplied |
| `REQUEST_TIMEOUT_SECONDS` | `20` locally; VM template uses `900` |

## Chat/RAG Conversation Manager (`chatbot and rag/`)

### Contract

- `GET /health` returns service status.
- `POST /chat` accepts `{ "message": string, "session_id": UUID | null }`.
- The message must be nonblank and at most 2,000 characters.
- It returns `session_id`, `original_question`, `search_query`, `answer`, `tts_text`, `sources`, and `grounded`.

### Processing

1. Establish or resume a UUID-keyed SQLite session.
2. Deterministically rewrite ambiguous follow-up questions from stored intent/history when enabled.
3. Ask the configured retriever (the intended Person 1 `/api/v1/retrieve` API) for up to three policy contexts.
4. If the retriever has no context, return its supplied answer without calling Qwen.
5. Otherwise prompt Qwen solely with retrieved context to produce a standard-Burmese answer.
6. Validate model output. Hard failures use an extractive RAG fallback; soft style issues are deterministically repaired. There is no model retry.
7. Create `tts_text` deterministically by normalizing abbreviations, UI terms, phone numbers, digits, and formal phrasing; it does not make another model request.

The RAG session store defaults to `data/session_history.sqlite3`. `MAX_HISTORY_MESSAGES=6` retains the latest three complete turns; it can contain customer messages and should be protected and backed up appropriately.

### Model and retrieval settings

- Default LLM backend: Ollama at `http://127.0.0.1:11434`.
- Default model: `qwen3:4b-instruct-2507-q4_K_M` (Qwen3 4B Q4 build).
- Default context window: 4,096 tokens; maximum generation: 512 tokens; Ollama keep-alive: one hour.
- The optional Transformers path defaults to `Qwen/Qwen3-4B-Instruct-2507` with 4-bit enabled.
- Default retriever backend is `mock`; set `RETRIEVER_BACKEND=person1`, `PERSON1_RAG_URL`, and `PERSON1_RAG_API_KEY` to use the private external retriever. Its token is sent in `X-RAG-Service-Token`.

### Answer-safety behavior

Qwen receives retrieved policy context only. The prompt and validation prohibit fabricated fees, contacts, documents, or procedures and disclosure-oriented requests for PIN, OTP, CVV, or passwords. Invalid or truncated model outputs, dangerous omissions/reversed constraints, unwanted CJK script, and similar hard failures switch to source-derived fallback text. Sources always originate from the retriever, not the language model.

## Speech-to-text service (`speech-to-text/`)

### Contract and limits

- `GET /health` is the health endpoint.
- `POST /api/v1/transcribe` accepts multipart form field `file` and returns `{ success, data }`.
- `data` includes raw/corrected/final transcript fields, correction/validation status, warnings, and processing metadata.
- Defaults: maximum audio size 20 MB; accepted formats `wav`, `mp3`, `m4a`, and `webm`; maximum duration 30 seconds; end-to-end timeout 900 seconds.
- This is a synchronous, non-streaming v1. Whisper loads lazily on the first request; a timed-out request does not cancel a shared model-loading task.

### Pipeline

```text
upload validation
→ FFmpeg decode to 16 kHz mono WAV
→ DC offset removal and 80 Hz high-pass filtering
→ optional mild `afftdn` noise suppression
→ capped peak normalization (-3 dBFS, ≤12 dB gain)
→ energy-based VAD with 250 ms padding
→ audio-quality gate
→ Burmese Whisper ASR
→ optional Gemini correction
→ deterministic protected-value validation
→ final transcript + warnings
```

The ASR model is `chuuhtetnaing/whisper-large-v3-myanmar`; device and dtype default to `auto`. The optional correction provider is Gemini (`gemini-2.5-flash` in the example environment). If Gemini cannot run, transcription still succeeds with the raw ASR transcript and a correction-unavailable warning. Corrections that alter protected numeric values or change too much text are rejected.

Severe clipping, no speech, and extremely low volume are rejected. Moderate clipping/low volume or excessive silence are preserved with warnings. Debug intermediate audio is disabled by default and must remain disabled in production because it stores customer recordings.

## Local development

Prerequisites: Python 3.11+ for STT, Python environments for all backend services, Node.js/npm for the frontend, FFmpeg for normal STT audio normalization, and Ollama plus the Qwen model when using local RAG generation.

```powershell
# 1. Speech-to-text
cd "speech-to-text"
Copy-Item .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001

# 2. Chat/RAG (separate terminal)
cd "chatbot and rag"
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8002

# 3. Main backend (separate terminal)
cd backend
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --port 8000

# 4. Frontend (separate terminal)
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

Open the Vite URL shown by the frontend process, then sign in with the development customer account above. API documentation is available at `http://localhost:8000/docs`, `http://localhost:8001/docs`, and `http://localhost:8002/docs` when their services are running.

Tests run with `pytest` in each Python service directory. The frontend type check is `npm run lint` and its production build is `npm run build`.

## Docker and VM deployment

The root Compose stack intentionally deploys only the frontend and main backend:

- The frontend is built by Vite, served by Nginx on port 80, and Nginx proxies `/api/` to the private backend container.
- The backend is not publicly published; its SQLite database is persisted in named volume `backend-data` at `/app/data/banking.db`.
- Docker health-checks `GET /api/v1/health` before the frontend starts.
- Chat/RAG, Ollama, STT, Whisper, and TTS remain on the model computer, reachable only through a VPN/private LAN.

For a VM, copy `deploy/vm.backend.env.example` to `deploy/vm.backend.env`, set the model computer's private addresses and a unique session secret, restrict the file permissions, and place the frontend behind HTTPS. Do not publish ports 8001, 8002, or 11434 to the public internet. The current Chat/RAG and STT services have no service-to-service authentication; private networking is the minimum, with mTLS or an internal token recommended before production.

## Security and operational checklist

- Replace bootstrap accounts and the default session secret before deployment.
- Keep the SQLite databases, session histories, and any debug audio out of source control and protected at rest.
- Configure exact production CORS origins and HTTPS.
- Keep upstream model ports private; allow only the VM's VPN address through the model computer firewall.
- Provision real retriever credentials and Gemini keys outside the repository; never commit them.
- Add an indexing workflow before relying on staff-created knowledge documents for RAG answers.
- Add service-to-service authentication, observability, model warm-up/readiness checks, representative Burmese quality evaluation, and retention/privacy policies before production.
- Treat browser sensitive-data filtering and the model prompt as defense-in-depth only; apply backend and organizational banking-security controls as well.

## Known limitations

- No TTS service is included; browser synthesis remains the active playback mechanism.
- STT and Chat/RAG are synchronous and can have high first-request latency while models load.
- RAG availability depends on the external retriever and its host/network availability.
- Chat/RAG session history is local SQLite state and is not shared across service instances by default.
- The frontend contains legacy mock/Gemini server code that should not be mistaken for the live backend integration.
- The system is an engineering implementation and its generated policy answers require bank approval, safety review, privacy review, and Burmese-language evaluation before real customer use.
