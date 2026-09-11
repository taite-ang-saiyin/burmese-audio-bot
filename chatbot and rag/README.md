# Person 2 — Qwen RAG Conversation Manager

FastAPI conversation and answer-generation service for a Burmese banking RAG
system. Person 1 retrieves document context; Person 2 uses that context to
generate a grounded Burmese answer with a local Ollama model.

## Runtime flow

```text
Customer question
      ↓
SQLite session history and deterministic follow-up query rewrite
      ↓
POST Person 1 /api/v1/retrieve
      ↓
Person 1 response adapter
      ↓
Qwen3-4B-Instruct-2507 answer generation
      ↓
Lightweight validation (no model retry)
      ↓
RAG extractive fallback only for hard validation failures
      ↓
Answer + natural Burmese TTS text + source metadata
```

There is no `approved_answer` in the generation path. When Person 1 returns
contexts, Qwen generates the answer from `contexts[].text`. When Person 1
returns `has_context: false`, Person 2 returns Person 1's `answer` without
calling Qwen.

## Model

The CPU configuration uses Ollama's 2.5 GB Q4_K_M build of
`Qwen/Qwen3-4B-Instruct-2507`:

```powershell
ollama pull qwen3:4b-instruct-2507-q4_K_M
```

The configured Ollama context is limited to 4096 tokens, generation to 512 new
tokens, and keep-alive to one hour for a CPU-only laptop.

## Configure Person 1 RAG

Put these values in `.env`. Paste the private key Person 1 gave you into
`PERSON1_RAG_API_KEY`; do not commit the real key.

```dotenv
RETRIEVER_BACKEND=person1
PERSON1_RAG_URL=http://192.168.48.192:8000/api/v1/retrieve
PERSON1_RAG_API_KEY=PASTE_THE_PRIVATE_KEY_HERE
PERSON1_RAG_TOP_K=3
PERSON1_RAG_TIMEOUT_SECONDS=30
```

The key is sent in the documented `X-RAG-Service-Token` header. Use
`RETRIEVER_BACKEND=mock` for offline tests when Person 1's laptop is unavailable.

Both laptops must be on the same LAN. Person 1's server must listen on
`0.0.0.0`, its firewall must allow port 8000, and the laptop must remain awake.

## Windows CPU quick start

```powershell
cd E:\voice\person2_qwen_rag
python -m pip install -r requirements.txt
ollama pull qwen3:4b-instruct-2507-q4_K_M
python -m pytest -q
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8002
```

If `ollama serve` says port `11434` is already in use, Ollama is already
running. Do not start a second Ollama server.

Open Person 2 Swagger UI at `http://127.0.0.1:8002/docs`. Person 1 can use port
8000 on her laptop at the same time because the two machines have different IPs.

First `/chat` request:

```json
{
  "message": "ကတ်အသစ် ထုတ်ယူရာတွင် မည်သည့် စာရွက်စာတမ်းများ ယူဆောင်လာရမည်နည်း။"
}
```

For a follow-up, reuse the UUID returned in the first response:

```json
{
  "session_id": "RETURNED_UUID",
  "message": "ကိုယ်စားလှယ်နဲ့ ထုတ်ယူရင်ရော ဘာလိုမလဲ။"
}
```

Placeholder session values such as `"string"` are rejected with HTTP 422.

Conversation history is stored in `data/session_history.sqlite3`, keyed by the
returned `session_id`. `MAX_HISTORY_MESSAGES=6` keeps the latest three complete
user/assistant turns in the Qwen prompt. Both the short topic and the full intent
query are stored separately. Therefore a generic reference such as
`အဲဒါကို ဘယ်လိုလုပ်ရမလဲ` reuses the previous full lost-card query instead of
degrading it to the ambiguous query `ATM ကတ် ဘယ်လိုလုပ်ရမလဲ`, even after an API
restart.
Every follow-up must reuse the UUID returned by the first request; omitting it
starts a new conversation.

## Current Person 1 RAG contract

Person 2 accepts the current HTTP response shape:

```json
{
  "query": "ကတ်အသစ် ထုတ်ယူရာတွင် မည်သည့် စာရွက်စာတမ်းများ ယူဆောင်လာရမည်နည်း",
  "language": "my",
  "has_context": true,
  "confidence": "high",
  "contexts": [
    {
      "rank": 1,
      "chunk_id": "card_replacement_policy_md_sec_2",
      "question": "ကတ်အသစ် ထုတ်ယူရာတွင် မည်သည့် စာရွက်စာတမ်းများ ယူဆောင်လာရမည်နည်း။",
      "text": "Retrieved banking policy text",
      "source": {
        "doc_name": "card_replacement_policy.md",
        "section": "Required Verification Documents",
        "page_number": 1
      },
      "retrieval_score": 0.18987220353917703
    }
  ],
  "citations": [],
  "answer": "Only used when has_context is false",
  "instructions": {
    "answer_only_from_context": true,
    "answer_language": "my",
    "include_citations": true,
    "return_json_only": true,
    "do_not_invent_information": true
  }
}
```

`adapt_person1_response()` maps both this HTTP schema and the older mock schema
into the internal chunk format. Source fields map as follows:

| Person 1 | Person 2 output |
|---|---|
| `source.doc_name` | `sources[].document` |
| `source.page_number` | `sources[].page` |
| `source.section` | `sources[].section` |
| `retrieval_score` | `sources[].score` |

Person 1 owns relevance through `has_context` and `confidence`. Person 2 does
not apply the old fixed `0.65` threshold because embedding score scales differ.
A returned context with score `0.189872...` is therefore kept and sent to Qwen.

## Synthetic tests

- `data/mock_person1_rag_responses.json`: synthetic Person 1-style responses.
- `data/mock_banking_questions.json`: formal, casual and mixed-language tests.
- The data is synthetic and is not a real bank policy.

Run fast deterministic tests:

```powershell
python -m pytest -q
```

Run one real CPU Ollama generation test:

```powershell
python scripts/run_fake_rag_samples.py --intent atm_lost_card --limit 1 --show-answer
```

## Answer safety

- Qwen receives only Person 1's retrieved banking context.
- Each `/chat` request calls Qwen at most once. Ambiguous follow-up search
  queries are rewritten deterministically from session history.
- The prompt prohibits invented phone numbers, fees, documents and procedures.
- Critical omissions, reversed restrictions, damaged output, unexpected
  Chinese/Japanese/Korean script, filler introductions and requests to disclose
  PIN/OTP/CVV/Password are hard validation failures. The answer then falls back
  to the complete selected RAG facts without calling Qwen again.
- An Ollama `done_reason: length` response is also a hard failure. This prevents
  a token-truncated word or sentence from being accepted merely by appending
  punctuation, and uses the same complete RAG fallback without a model retry.
- Punctuation, formal wording and mild repetition are soft checks repaired
  deterministically and never cause a model retry.
- Source metadata always comes from Person 1, never from Qwen.
- Qwen is prompted to produce one clear, fact-complete standard-Burmese answer.
  Spoken-style rewriting is deliberately excluded from this generation step,
  and Qwen is called at most once per request.
- `answer` uses the generated response or the source-only extractive fallback.
  `tts_text` does not call Qwen again; deterministic rules only normalize
  abbreviations, UI terms, phone numbers, digits and remaining formal wording.

## Current limitations

- Session history is local to the configured SQLite database. Back up and
  protect this file if conversation history must survive machine loss; it can
  contain customer messages.
- Person 1's LAN API is unavailable when her laptop sleeps, disconnects or its
  firewall blocks the connection.
- Model-generated answers still need representative Burmese evaluation before
  production use.
- TTS normalization needs listening tests with Person 3's final speech engine.
