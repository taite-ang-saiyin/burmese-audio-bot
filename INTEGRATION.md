# Integrated local runbook

The running request paths are:

```text
Browser -> Main Backend (:8000) -> Chat/RAG (:8002)
                              -> Speech-to-text (:8001)
```

TTS is intentionally not connected yet. The existing browser playback remains
in place so a supplied TTS service can later replace only that adapter.

1. Start Speech-to-text from `speech-to-text` on port 8001. Copy
   `.env.example` to `.env`, set any required local credentials, and run
   `uvicorn app.main:app --host 0.0.0.0 --port 8001`.
2. Start Chat/RAG from `chatbot and rag` on port 8002. Configure its retriever
   and LLM, then run `python -m uvicorn app.main:app --host 127.0.0.1 --port 8002`.
3. In `backend`, copy `.env.example` to `.env`; keep the shown Chat/RAG and STT
   endpoints, then run `uvicorn app.main:app --reload --port 8000`.
4. In `frontend`, copy `.env.example` to `.env` and run `npm install` once,
   then `npm run dev`. The default API base already targets the main backend.

Sign in with the development customer account `customer@mingalarbank.com` and
password `ChangeMe123!`, or use the one-click customer option. These bootstrap
accounts are for development only and must be replaced before deployment.

Text queries and confirmed voice transcripts are persisted by the main backend.
The Conversation Manager's returned `session_id` is stored with the assistant
message and supplied on the next turn, so RAG follow-up context survives page
reloads without sending browser-side history to the LLM service.
