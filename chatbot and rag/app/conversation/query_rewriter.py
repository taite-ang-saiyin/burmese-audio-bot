from __future__ import annotations

import re

from app.config import settings


_EXPLICIT_BANKING_SUBJECTS = (
    "atm",
    "ကတ်",
    "mobile banking",
    "ဖုန်းနံပါတ်",
    "otp",
    "pin",
    "password",
    "ငွေလွှဲ",
    "transaction",
    "account",
    "ဘဏ်အကောင့်",
    "ချေးငွေ",
)

_SUBJECT_LABELS = (
    ("mobile banking", "Mobile Banking"),
    ("ဘဏ်အကောင့်", "ဘဏ်အကောင့်"),
    ("ဖုန်းနံပါတ်", "ဖုန်းနံပါတ်"),
    ("ငွေလွှဲ", "ငွေလွှဲခြင်း"),
    ("ချေးငွေ", "ချေးငွေ"),
    ("transaction", "transaction"),
    ("password", "Password"),
    ("otp", "OTP"),
    ("pin", "PIN"),
    ("atm", "ATM ကတ်"),
    ("ကတ်", "ကတ်"),
    ("account", "account"),
)

_FOLLOW_UP_MARKERS = (
    "ဒါဆို",
    "အဲဒါ",
    "အဲ့ဒါ",
    "အဲဒီ",
    "အဲ့ဒီ",
    "ပြီးတော့",
    "ရော",
    "ကော",
)

_SHORT_FOLLOW_UP_STARTS = (
    "ဘယ်လောက်",
    "ဘယ်မှာ",
    "ဘယ်လို",
    "ဘာလို",
    "ရလား",
    "ရမလား",
)

_GENERIC_FOLLOW_UP_QUESTIONS = {
    "ဘယ်လိုလုပ်ရမလဲ",
    "ဘယ်လိုဆက်လုပ်ရမလဲ",
    "ဘာလုပ်ရမလဲ",
    "ဘာဆက်လုပ်ရမလဲ",
    "ဘယ်လိုလဲ",
}


class QueryRewriter:
    def __init__(self, llm) -> None:
        # Kept for backward-compatible construction. Query rewriting is now
        # deterministic so the only model call in /chat is answer generation.
        self.llm = llm

    @staticmethod
    def _needs_rewrite(question: str) -> bool:
        normalized = re.sub(r"\s+", " ", question.casefold()).strip()

        # A question that names its banking subject is already useful for
        # retrieval. Rewriting it risks contaminating it with old history.
        if any(term in normalized for term in _EXPLICIT_BANKING_SUBJECTS):
            return False

        if any(marker in normalized for marker in _FOLLOW_UP_MARKERS):
            return True

        if len(normalized) <= 50 and normalized.startswith(_SHORT_FOLLOW_UP_STARTS):
            return True

        return bool(re.search(r"\b(it|that|this|them|same one)\b", normalized))

    @staticmethod
    def extract_subject(text: str) -> str | None:
        normalized = re.sub(r"\s+", " ", text.casefold()).strip()
        for marker, label in _SUBJECT_LABELS:
            if marker in normalized:
                return label
        return None

    def rewrite(
        self,
        question: str,
        history: list[dict[str, str]],
        session_topic: str | None = None,
        session_intent_query: str | None = None,
    ) -> str:
        if (
            not settings.enable_query_rewrite
            or (not history and not session_intent_query)
            or not self._needs_rewrite(question)
        ):
            return question

        subject = (session_topic or "").strip()
        intent_query = (session_intent_query or "").strip()
        for item in reversed(history[-settings.max_history_messages :]):
            if item.get("role") != "user":
                continue
            previous_question = str(item.get("content", "")).strip()
            previous_subject = self.extract_subject(previous_question)
            if previous_subject:
                subject = subject or previous_subject
                intent_query = intent_query or previous_question
                break

        if not subject:
            return question

        standalone = question.strip()
        marker_pattern = "|".join(
            re.escape(marker) for marker in sorted(_FOLLOW_UP_MARKERS, key=len, reverse=True)
        )
        standalone = re.sub(
            rf"^(?:{marker_pattern})(?:ကို|က|နဲ့|အတွက်)?[\s၊]*",
            "",
            standalone,
            flags=re.IGNORECASE,
        ).strip()
        if not standalone:
            return question

        normalized_standalone = re.sub(
            r"[\s၊။,.!?;:'\"()]+",
            "",
            standalone.casefold(),
        )
        if intent_query and normalized_standalone in _GENERIC_FOLLOW_UP_QUESTIONS:
            return intent_query

        if subject.casefold() in standalone.casefold():
            return standalone
        return f"{subject} {standalone}"
