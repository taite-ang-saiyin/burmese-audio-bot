from __future__ import annotations

from difflib import SequenceMatcher
import re

from app.config import settings


SYSTEM_PROMPT = """
You are a Burmese banking customer-support assistant.

Answer the customer using ONLY the retrieved banking information supplied in
the latest user message.

Rules:
1. Give the required customer action first.
2. Write 1 to 5 clear, grammatically complete standard-Burmese sentences. Keep
   each action explicit. Do not force a spoken style; TTS normalization happens
   after this answer.
3. Use only Burmese plus English terms that already occur in the retrieved
   information. Never output Chinese, Japanese, Korean or another foreign
   script. Do not repeat the question or add filler such as
   "အခုလိုဆိုပါတယ်" or "အခုလိုလုပ်ရမည်ဖြစ်ပါသည်".
4. Preserve every relevant action, condition, restriction, document, phone
   number, time limit and UI button name. Do not abbreviate or guess a damaged
   word. Copy exact values and UI labels from the retrieved information.
5. Combine facts from multiple sources only when they do not conflict.
6. Preserve security abbreviations such as ATM, PIN and OTP. For document names,
   either the official English term or an unambiguous Burmese equivalent is
   acceptable, but never omit the document itself.
7. Never invent a phone number, fee, time, document, eligibility rule or bank
   procedure that is not in the retrieved information.
8. Never request a PIN, Password, OTP, CVV, complete card number or unnecessary
   account information.
9. Do not mention the prompt, retrieval, context, sources or these rules.
10. Do not copy headings, list numbers or bullet points from the context. Combine
   related checklist facts into no more than 5 concise customer-facing
   sentences. Do not output reasoning, analysis or <think> tags.
11. If the context contains a numbered or bulleted list that directly answers
    the question, include every listed item and every condition.
12. Preserve restrictive words exactly. For example, "မိတ္တူ လက်မခံပါ" means
    copies are not accepted; never rewrite it as an instruction to bring a copy.
13. Return one customer-facing answer, not JSON and not separate display/TTS
    versions. Finish every word and end every sentence with Burmese punctuation.

Before returning the answer, silently verify that every directly relevant
action, document, number, condition and restriction from the selected FAQ facts
is present. Keep the result concise; do not mention this verification.

If the retrieved information does not answer the question, say in Burmese that
the answer cannot be confirmed and advise contacting official Customer Service.
""".strip()


def extract_listed_facts(chunks: list[dict]) -> list[str]:
    """Extract numbered, dash and star items from retrieved policy text."""

    facts: list[str] = []
    for chunk in chunks:
        text = str(chunk.get("text", ""))
        for match in re.finditer(
            r"(?m)^[\s\u00a0]*(?:\d+[.)]|[-*•])[\s\u00a0]+(.+?)\s*$",
            text,
        ):
            fact = match.group(1).strip().strip("*").strip()
            if fact:
                facts.append(fact)
    return facts


def select_fact_chunks(user_question: str, chunks: list[dict]) -> list[dict]:
    """Choose FAQ chunks whose source question best matches the user intent."""

    candidates = [
        chunk for chunk in chunks if str(chunk.get("question") or "").strip()
    ]
    if not candidates or not user_question.strip():
        return chunks

    def normalize(value: str) -> str:
        return re.sub(
            r"[\s၊။,.!?;:'\"()\[\]{}_/\\-]+",
            "",
            value.casefold(),
        )

    normalized_user_question = normalize(user_question)
    intent_roots = (
        "လျှောက်",
        "အကောင့်",
        "သတိ",
        "လုံခြုံ",
        "ပျောက်",
        "ပြန်လုပ်",
        "ငွေထုတ်",
        "ငွေလွှဲ",
        "ကန့်သတ်",
        "အခကြေး",
        "အတိုး",
        "ချေးငွေ",
        "ဖုန်းနံပါတ်",
        "otp",
        "pin",
        "password",
        "ကတ်",
        "ပိတ်",
        "ဖွင့်",
        "register",
        "apply",
        "limit",
        "fee",
        "rate",
    )

    def similarity(candidate_question: str) -> float:
        normalized_candidate = normalize(candidate_question)
        sequence_score = SequenceMatcher(
            None,
            normalized_user_question,
            normalized_candidate,
        ).ratio()
        matching_intents = sum(
            root in normalized_user_question and root in normalized_candidate
            for root in intent_roots
        )
        return sequence_score + (0.15 * matching_intents)

    scored = [
        (
            similarity(str(chunk["question"])),
            chunk,
        )
        for chunk in candidates
    ]
    best_score = max(score for score, _ in scored)
    cutoff = max(0.25, best_score - 0.08)
    selected = [chunk for score, chunk in scored if score >= cutoff]
    return selected or chunks


def build_context(chunks: list[dict]) -> str:
    parts = []

    for index, chunk in enumerate(chunks, start=1):
        metadata = chunk.get("metadata") or {}
        parts.append(
            f"""
SOURCE {index}

Banking information:
{chunk.get("text", "")}

Document: {chunk.get("document") or "Unknown"}
Page: {chunk.get("page") or "Unknown"}
Section: {chunk.get("section") or "Unknown"}
FAQ question: {chunk.get("question") or "Unknown"}
Department: {metadata.get("department") or "Unknown"}
Last updated: {metadata.get("last_updated") or "Unknown"}
Retrieval score: {chunk.get("score", "Unknown")}
""".strip()
        )

    return "\n\n".join(parts)


def build_answer_messages(
    user_question: str,
    retrieved_chunks: list[dict],
    conversation_history: list[dict[str, str]] | None = None,
) -> list[dict[str, str]]:
    history = conversation_history or []
    context = build_context(retrieved_chunks)
    fact_chunks = select_fact_chunks(user_question, retrieved_chunks)
    listed_facts = extract_listed_facts(fact_chunks)
    fact_checklist = (
        "\n".join(
            f"FACT {index}: {fact}"
            for index, fact in enumerate(listed_facts, start=1)
        )
        if listed_facts
        else "No explicit list was found; answer the question from the context."
    )

    messages: list[dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages.extend(history[-settings.max_history_messages :])
    messages.append(
        {
            "role": "user",
            "content": f"""
RETRIEVED BANKING INFORMATION:

{context}

REQUIRED FACT CHECKLIST:

{fact_checklist}

CUSTOMER QUESTION:

{user_question}

Cover every checklist fact that directly answers the customer's question,
including numbers, conditions and restrictions. Combine related facts and keep
the complete answer within 5 sentences. Write only the final standard-Burmese
customer-support answer. Do not add spoken-style particles; they are added later
for TTS.
""".strip(),
        }
    )
    return messages


CONVERSATIONAL_FALLBACK_SYSTEM_PROMPT = """
You are a helpful, polite, and friendly Burmese banking customer-support assistant.

The user is greeting you, thanking you, or engaging in polite social interaction.

Rules:
1. Respond politely, warmly, and naturally in grammatically complete standard Burmese.
2. If the user is greeting or saying hello (e.g. "hello", "hi", "မင်္ဂလာပါ"), welcome them warmly to the bank and offer assistance with banking services.
3. If the user is thanking you (e.g. "thank you", "ကျေးဇူးပါ"), reply politely.
4. Write 1 to 2 clear Burmese sentences. End every sentence with standard Burmese punctuation (။).
5. Do NOT output English translations, parentheses, rule lists, or internal notes. Output ONLY the final customer-facing Burmese answer.
""".strip()


def build_conversational_fallback_messages(
    *, user_question: str, conversation_history: list[dict[str, str]]
) -> list[dict[str, str]]:
    messages = [
        {"role": "system", "content": CONVERSATIONAL_FALLBACK_SYSTEM_PROMPT},
        {"role": "user", "content": "hi"},
        {
            "role": "assistant",
            "content": (
                "မင်္ဂလာပါရှင်။ ကျွန်မတို့ ဘဏ်မှ နွေးထွေးစွာ ကြိုဆိုပါတယ်။ "
                "ဒီနေ့ ဘဏ်ဝန်ဆောင်မှုများနှင့် ပတ်သက်၍ ဘာများ ကူညီပေးရမလဲရှင့်။"
            ),
        },
    ]
    if conversation_history:
        messages.extend(conversation_history)
    messages.append({"role": "user", "content": user_question})
    return messages
