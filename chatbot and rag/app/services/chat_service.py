from __future__ import annotations

from collections import Counter
import logging
import re

from app.config import settings
from app.normalization.burmese_normalizer import normalize_for_tts
from app.prompts.prompt_builder import (
    build_answer_messages,
    build_conversational_fallback_messages,
    extract_listed_facts,
    select_fact_chunks,
)
from app.retrieval.retrieval_client import RetrievalResult


logger = logging.getLogger(__name__)


UNSUPPORTED_ANSWER = (
    "ရရှိထားသော ဘဏ်၏ အတည်ပြုအချက်အလက်များအရ "
    "ဤမေးခွန်းကို အတည်ပြု၍ မဖြေနိုင်သေးပါ။ "
    "အသေးစိတ်အတွက် သက်ဆိုင်ရာ ဘဏ်ဝန်ထမ်း သို့မဟုတ် "
    "တရားဝင် Customer Service ကို ဆက်သွယ်စုံစမ်းပေးပါ။"
)


class ChatService:
    _KNOWN_BANKING_TERMS = (
        "ATM",
        "OTP",
        "PIN",
        "CVV",
    )
    _KNOWN_BANKING_TERM_EQUIVALENTS = {
        "ATM": ("ATM", "အေတီအမ်"),
        "OTP": ("OTP", "အိုတီပီ", "တစ်ကြိမ်သုံးလုံခြုံရေးကုဒ်"),
        "PIN": ("PIN", "ပီအိုင်အန်"),
        "CVV": ("CVV", "စီဗီဗီ"),
    }
    _LIST_FACT_GROUPS = (
        (
            "NRC / နိုင်ငံသားစိစစ်ရေးကတ်ပြား",
            ("NRC", "နိုင်ငံသားစိစစ်ရေးကတ်ပြား", "မှတ်ပုံတင်"),
        ),
        ("Passport / နိုင်ငံကူးလက်မှတ်", ("Passport", "နိုင်ငံကူးလက်မှတ်")),
        (
            "Stay Permit / နေထိုင်ခွင့်လက်မှတ်",
            ("Stay Permit", "နေထိုင်ခွင့်လက်မှတ်", "နေထိုင်ခွင့်"),
        ),
        (
            "Power of Attorney / ကိုယ်စားလှယ်လွှဲစာ",
            ("Power of Attorney", "ကိုယ်စားလှယ်လွှဲစာ", "လွှဲစာ"),
        ),
        (
            "Mobile Banking",
            ("Mobile Banking", "မိုဘိုင်းဘဏ်ဝန်ဆောင်မှု"),
        ),
        (
            "Customer Service Hotline",
            (
                "Customer Service Hotline",
                "Customer Service",
                "Hotline",
                "Call Center",
                "ဖောက်သည်ဝန်ဆောင်မှုဌာန",
            ),
        ),
        (
            "Card Management",
            ("Card Management", "ကတ်စီမံခန့်ခွဲမှု"),
        ),
        (
            "ကတ်ပိတ်ဆို့ခြင်း",
            ("ပိတ်ဆို့", "ပိတ်ထား", "Block Card", "Freeze Card", "temporary block"),
        ),
        ("ကတ်အသစ်", ("ကတ်အသစ်", "အသစ်ပြန်လျှောက်")),
        ("လူကိုယ်တိုင်", ("လူကိုယ်တိုင်", "ကိုယ်တိုင်")),
        ("လျှောက်ထား", ("လျှောက်", "apply")),
        ("App Store", ("App Store", "အက်ပ်စတိုး")),
        (
            "Google Play Store",
            ("Google Play Store", "ဂူးဂဲလ်ပလေးစတိုး"),
        ),
        ("ဒေါင်းလုဒ်", ("ဒေါင်းလုဒ်", "download")),
        (
            "Register New Account",
            ("Register New Account", "အကောင့်အသစ်စာရင်းသွင်း"),
        ),
        ("ဘဏ်အကောင့်နံပါတ်", ("ဘဏ်အကောင့်နံပါတ်", "accountnumber")),
        (
            "ဘဏ်တွင်စာရင်းသွင်းထားသော ဖုန်းနံပါတ်",
            (
                "ဘဏ်တွင်စာရင်းသွင်းထားသောဖုန်းနံပါတ်",
                "ဘဏ်မှာစာရင်းသွင်းထားတဲ့ဖုန်းနံပါတ်",
                "registeredphonenumber",
            ),
        ),
        (
            "OTP / တစ်ကြိမ်သုံးလုံခြုံရေးကုဒ်",
            ("OTP", "One-Time Password", "တစ်ကြိမ်သုံးလုံခြုံရေးကုဒ်", "အိုတီပီ"),
        ),
        ("OTP ဂဏန်း ၆ လုံး", ("၆လုံး", "6လုံး", "ခြောက်လုံး")),
        ("ရိုက်ထည့်", ("ရိုက်ထည့်", "ထည့်သွင်း")),
        ("အတည်ပြု", ("အတည်ပြု", "verify")),
        ("ဘဏ်ခွဲ", ("ဘဏ်ခွဲ", "branch")),
        (
            "အက်ပ်မှလျှောက်ထားရာတွင် အဆင်မပြေပါက",
            (
                "အက်ပ်မှလျှောက်ထားရာတွင်အဆင်မပြေ",
                "အက်ပ်မှလျှောက်ထားရာမှာအဆင်မပြေ",
                "အက်ပ်မှလျှောက်ထားရင်အဆင်မပြေ",
                "အက်ပ်မှလျှောက်ထားတဲ့အခါအဆင်မပြေ",
                "အက်ပ်ကနေလျှောက်လို့အဆင်မပြေ",
                "အက်ပ်ကနေအဆင်မပြေ",
                "အဆင်မပြေပါက",
                "အဆင်မပြေရင်",
                "အဆင်မပြေတဲ့အခါ",
                "အဆင်မပြေရာမှာ",
                "appregistrationအဆင်မပြေ",
            ),
        ),
        ("နိုင်ငံခြားသား", ("နိုင်ငံခြားသား",)),
        ("ကိုယ်စားလှယ်", ("ကိုယ်စားလှယ်",)),
        ("မူရင်း", ("မူရင်း",)),
    )

    def __init__(self, *, llm, retriever, session_manager, query_rewriter) -> None:
        self.llm = llm
        self.retriever = retriever
        self.session_manager = session_manager
        self.query_rewriter = query_rewriter

    @staticmethod
    def _filter_chunks(chunks: list[dict]) -> list[dict]:
        # Person 1 owns retrieval relevance and exposes it through
        # `has_context`/`confidence`. Similarity score scales vary by embedding
        # model, so applying Person 2's old 0.65 threshold would incorrectly
        # discard valid results such as score=0.189872.
        return [chunk for chunk in chunks if str(chunk.get("text", "")).strip()]

    @staticmethod
    def _source_metadata(chunks: list[dict]) -> list[dict]:
        return [
            {
                "document": chunk.get("document"),
                "page": chunk.get("page"),
                "section": chunk.get("section"),
                "score": chunk.get("score"),
            }
            for chunk in chunks
        ]

    @classmethod
    def _required_terms(cls, question: str, chunks: list[dict]) -> list[str]:
        context = " ".join(str(chunk.get("text", "")) for chunk in chunks)
        context_lower = context.lower()
        question_lower = question.lower()
        return [
            term
            for term in cls._KNOWN_BANKING_TERMS
            if term.lower() in context_lower and term.lower() in question_lower
        ]

    @staticmethod
    def _numbered_context_facts(
        chunks: list[dict], question: str = ""
    ) -> list[str]:
        return extract_listed_facts(select_fact_chunks(question, chunks))

    @staticmethod
    def _normalize_fact_text(text: str) -> str:
        return re.sub(
            r"[\s()\[\]{}*\"'“”‘’]+",
            "",
            text.casefold(),
        )

    @classmethod
    def _fact_groups_in_text(cls, text: str) -> list[tuple[str, tuple[str, ...]]]:
        normalized = cls._normalize_fact_text(text)
        return [
            (label, equivalents)
            for label, equivalents in cls._LIST_FACT_GROUPS
            if any(
                cls._normalize_fact_text(value) in normalized
                for value in equivalents
            )
        ]

    @classmethod
    def _text_has_fact_group(cls, text: str, equivalents: tuple[str, ...]) -> bool:
        normalized = cls._normalize_fact_text(text)
        return any(
            cls._normalize_fact_text(value) in normalized for value in equivalents
        )

    @classmethod
    def _missing_context_facts(
        cls, answer: str, chunks: list[dict], question: str = ""
    ) -> list[str]:
        """Find facts a small model omitted from a numbered policy list."""

        facts = cls._numbered_context_facts(chunks, question)
        if not facts:
            return []

        listed_text = " ".join(facts)
        listed_normalized = cls._normalize_fact_text(listed_text)
        answer_normalized = cls._normalize_fact_text(answer)
        missing: list[str] = []
        for label, equivalents in cls._LIST_FACT_GROUPS:
            normalized_equivalents = [
                cls._normalize_fact_text(value) for value in equivalents
            ]
            fact_is_listed = any(
                value in listed_normalized for value in normalized_equivalents
            )
            answer_has_equivalent = any(
                value in answer_normalized for value in normalized_equivalents
            )
            if fact_is_listed and not answer_has_equivalent:
                missing.append(label)

        # Each numbered item must remain intact in at least one answer
        # sentence. This prevents facts from item 1 (for example NRC original)
        # from incorrectly satisfying an incomplete item 3.
        answer_sentences = [
            sentence.strip()
            for sentence in re.split(r"[။.!?\n]+", answer)
            if sentence.strip()
        ]
        for index, fact in enumerate(facts, start=1):
            required_groups = cls._fact_groups_in_text(fact)
            if len(required_groups) < 2:
                continue
            item_is_covered = any(
                all(
                    cls._text_has_fact_group(sentence, equivalents)
                    for _, equivalents in required_groups
                )
                for sentence in answer_sentences
            )
            if not item_is_covered:
                labels = " + ".join(label for label, _ in required_groups)
                missing.append(f"စာရင်းအချက် {index}: {labels}")

        # A negative policy qualifier must remain negative. Merely mentioning
        # "မိတ္တူ" is not enough; "မိတ္တူ NRC မူရင်း" reverses the policy.
        if "မိတ္တူ" in listed_text and "လက်မခံ" in listed_text:
            keeps_copy_restriction = re.search(
                r"မိတ္တူ.{0,40}(?:လက်မခံ|မယူဆောင်|မလိုအပ်|"
                r"ယူဆောင်ရန်မလို|ယူလာရန်မလို|မရ(?:ပါ|ဘူး))",
                answer_normalized,
            )
            if not keeps_copy_restriction:
                missing.append("မိတ္တူ လက်မခံပါ")

        return list(dict.fromkeys(missing))

    @classmethod
    def _answer_rejection_reasons(
        cls, answer: str, chunks: list[dict], question: str = ""
    ) -> list[str]:
        """Return all hard failures and non-blocking quality warnings."""

        return cls._hard_rejection_reasons(
            answer, chunks, question
        ) + cls._soft_validation_warnings(answer)

    @classmethod
    def _hard_rejection_reasons(
        cls, answer: str, chunks: list[dict], question: str = ""
    ) -> list[str]:
        cleaned = answer.strip()
        reasons: list[str] = []
        if not cleaned:
            return ["answer is empty"]

        # These failures make the generated answer unsafe or unusable. Style,
        # punctuation and mild repetition are intentionally handled as soft
        # warnings and never trigger a second model call.
        if "á€" in cleaned or "�" in cleaned:
            reasons.append("answer contains damaged text encoding")
        if len(re.findall(r"[\u1000-\u109f]", cleaned)) < 5:
            reasons.append("answer contains too little Burmese text")
        if re.search(
            r"[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff"
            r"\uf900-\ufaff\uac00-\ud7af]",
            cleaned,
        ):
            reasons.append("answer contains an unexpected foreign script")
        if any(
            filler in cleaned
            for filler in (
                "အခုလိုဆိုပါတယ်",
                "အခုလိုလုပ်ရမည်ဖြစ်ပါသည်",
                "မေးခွန်းအတွက်အဖြေက",
            )
        ):
            reasons.append("answer contains a filler introduction")

        missing_required_terms = [
            term
            for term in cls._required_terms(question, chunks)
            if not cls._answer_has_required_term(cleaned, term)
        ]
        if missing_required_terms:
            reasons.append(
                "missing required banking terms: "
                + ", ".join(missing_required_terms)
            )

        missing_context_facts = cls._missing_context_facts(
            cleaned, chunks, question
        )
        if missing_context_facts:
            reasons.append(
                "missing numbered-list facts: " + ", ".join(missing_context_facts)
            )

        reasons.extend(cls._security_violation_reasons(cleaned))
        return reasons

    @classmethod
    def _answer_has_required_term(cls, answer: str, term: str) -> bool:
        equivalents = cls._KNOWN_BANKING_TERM_EQUIVALENTS.get(term, (term,))
        if cls._text_has_fact_group(answer, equivalents):
            return True

        # Burmese speakers often omit the already-established "ATM" and say
        # only "the card". Accept that shortening only when a concrete card
        # action is also present; a bare or malformed ကတ် mention still fails.
        if term == "ATM" and cls._text_has_fact_group(answer, ("ကတ်",)):
            return cls._text_has_fact_group(
                answer,
                (
                    "ပိတ်ဆို့",
                    "ပိတ်ထား",
                    "Block",
                    "Hotline",
                    "ဘဏ်ခွဲ",
                    "Mobile Banking",
                    "NRC",
                    "မှတ်ပုံတင်",
                ),
            )
        return False

    @classmethod
    def _security_violation_reasons(cls, answer: str) -> list[str]:
        """Reject instructions that ask customers to disclose secret values."""

        for sentence in re.split(r"[။.!?\n]+", answer):
            normalized = cls._normalize_fact_text(sentence)
            if not normalized:
                continue
            has_secret = any(
                cls._normalize_fact_text(value) in normalized
                for value in ("PIN", "OTP", "CVV", "Password")
            )
            asks_to_share = any(
                phrase in normalized
                for phrase in (
                    "ပြောပြပါ",
                    "ပြောပေးပါ",
                    "မျှဝေပါ",
                    "ပေးပို့ပါ",
                    "ပို့ပေးပါ",
                    "ဖော်ပြပါ",
                )
            )
            is_negative = any(
                phrase in normalized
                for phrase in (
                    "မပြော",
                    "မမျှဝေ",
                    "မပေးပို့",
                    "မပို့ပေး",
                    "မဖော်ပြ",
                    "မတောင်း",
                )
            )
            if has_secret and asks_to_share and not is_negative:
                return ["answer asks the customer to disclose a security secret"]
        return []

    @classmethod
    def _soft_validation_warnings(cls, answer: str) -> list[str]:
        cleaned = answer.strip()
        warnings: list[str] = []
        if len(cleaned) < 40:
            warnings.append("answer is shorter than 40 characters")
        if cleaned and not cleaned.endswith(("။", ".", "!", "?")):
            warnings.append("answer has no complete sentence ending")

        # Detect genuine loops without penalizing normal banking templates such
        # as "တစ်နေ့လျှင် အများဆုံး" or "အထိ ထုတ်ယူနိုင်ပါသည်".
        normalized_sentences = [
            re.sub(r"\s+", " ", sentence).strip().casefold()
            for sentence in re.split(r"[။.!?]+", cleaned)
            if sentence.strip()
        ]
        sentence_counts = Counter(normalized_sentences)
        if any(
            count > 1 and len(sentence.split()) >= 4
            for sentence, count in sentence_counts.items()
        ):
            warnings.append("answer repeats an entire sentence")

        words = re.findall(r"\S+", cleaned)
        if len(words) >= 10:
            five_grams = Counter(
                tuple(words[i : i + 5]) for i in range(len(words) - 4)
            )
            if any(count > 1 for count in five_grams.values()):
                warnings.append("answer repeats the same long phrase")

        if re.search(r"(?:တွင်|ဖြစ်ပါက|ဖြင့်|၏|ပါသည်)", cleaned):
            warnings.append("answer uses formal wording")

        return warnings

    @classmethod
    def _is_bad_answer(
        cls, answer: str, chunks: list[dict], question: str = ""
    ) -> bool:
        return bool(cls._hard_rejection_reasons(answer, chunks, question))

    @staticmethod
    def _log_hard_validation_failure(*, reasons: list[str], answer: str) -> None:
        if settings.log_rejected_answers:
            logger.warning(
                "Qwen answer failed hard validation; using RAG extractive "
                "fallback. Reasons: %s. Raw answer: %r",
                "; ".join(reasons),
                answer,
            )
        else:
            logger.warning(
                "Qwen answer failed hard validation; using RAG extractive "
                "fallback. Reasons: %s.",
                "; ".join(reasons),
            )

    @classmethod
    def _repair_soft_issues(cls, answer: str) -> str:
        """Apply cheap formatting repairs without another model generation."""

        cleaned = re.sub(r"[ \t]+", " ", answer).strip()
        cleaned = re.sub(r"\n{2,}", "\n", cleaned)

        # Remove exact duplicate sentences while preserving normal repeated
        # banking phrases such as limits for several card types.
        sentences = re.findall(r"[^။.!?\n]+[။.!?]?", cleaned)
        unique_sentences: list[str] = []
        seen: set[str] = set()
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
            normalized = re.sub(r"[။.!?\s]+", "", sentence.casefold())
            if normalized in seen and len(sentence.split()) >= 4:
                continue
            seen.add(normalized)
            unique_sentences.append(sentence)

        repaired = " ".join(unique_sentences) or cleaned
        if repaired and not repaired.endswith(("။", ".", "!", "?")):
            repaired += "။"
        return repaired

    @staticmethod
    def _clean_source_fact(text: str) -> str:
        cleaned = re.sub(r"[`*_]+", "", text).strip()
        cleaned = re.sub(r"^#{1,6}\s*", "", cleaned)
        cleaned = re.sub(r"^Q:\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s+", " ", cleaned).strip(" -–—")
        return cleaned

    @classmethod
    def _extractive_fallback_answer(
        cls, question: str, chunks: list[dict]
    ) -> str:
        """Build a complete source-only answer from the selected RAG facts."""

        selected_chunks = select_fact_chunks(question, chunks)
        listed_facts = [
            cls._clean_source_fact(fact)
            for fact in extract_listed_facts(selected_chunks)
        ]
        # Nested numbered-list labels such as "Self-Registration:" are
        # headings, not customer actions. The indented leaf facts carry the
        # actual instructions and must all be retained.
        actionable_facts = [
            fact for fact in listed_facts if fact and not fact.rstrip().endswith(":")
        ]

        facts: list[str] = []
        if actionable_facts:
            for chunk in selected_chunks:
                text = str(chunk.get("text", ""))
                first_list = re.search(
                    r"(?m)^[\s\u00a0]*(?:\d+[.)]|[-*•])[\s\u00a0]+",
                    text,
                )
                lead_text = text[: first_list.start()] if first_list else ""
                lead_lines = []
                for line in lead_text.splitlines():
                    stripped = line.strip()
                    if not stripped or stripped.startswith(("#", "---")):
                        continue
                    if re.match(r"^Q:\s*", stripped, flags=re.IGNORECASE):
                        continue
                    lead_lines.append(stripped)
                lead = cls._clean_source_fact(" ".join(lead_lines))
                if lead:
                    facts.append(lead)
            facts.extend(actionable_facts)
        else:
            for chunk in selected_chunks:
                lines = []
                for line in str(chunk.get("text", "")).splitlines():
                    stripped = line.strip()
                    if not stripped or stripped.startswith(("#", "---")):
                        continue
                    if re.match(r"^Q:\s*", stripped, flags=re.IGNORECASE):
                        continue
                    lines.append(stripped)
                fact = cls._clean_source_fact(" ".join(lines))
                if fact:
                    facts.append(fact)

        unique_facts = list(dict.fromkeys(facts))
        if not unique_facts:
            return ""

        # Keep the fallback concise without dropping any source fact. Four or
        # more checklist items are combined into at most three sentences.
        clause_facts = [fact.rstrip("။.!? ") for fact in unique_facts]
        group_count = min(3, len(clause_facts))
        groups: list[list[str]] = [[] for _ in range(group_count)]
        for index, fact in enumerate(clause_facts):
            group_index = min(index * group_count // len(clause_facts), group_count - 1)
            groups[group_index].append(fact)

        sentences = ["၊ ".join(group) + "။" for group in groups if group]
        return " ".join(sentences)

    @staticmethod
    def _is_greeting_or_courtesy(text: str) -> bool:
        normalized = re.sub(r"[\s,.!?;:'\"()]+", " ", text.casefold()).strip()
        greetings = (
            "hello", "hi", "hey", "good morning", "good afternoon", "good evening",
            "thank you", "thanks", "thank", "who are you", "who r u",
            "မင်္ဂလာပါ", "မင်္ဂလာ", "ကျေးဇူးပါ", "ကျေးဇူးတင်ပါတယ်", "ကျေးဇူးတင်ပါသည်",
            "နှုတ်ဆက်ပါတယ်", "ကူညီပေးပါ", "ဘယ်သူလဲ", "ဘယ်သူလဲရှင့်", "ဘယ်သူလဲခင်ဗျာ",
        )
        return len(normalized) <= 40 and any(g in normalized for g in greetings)

    @staticmethod
    def _is_banking_query(text: str) -> bool:
        normalized = text.casefold()
        banking_keywords = (
            "atm", "otp", "pin", "cvv", "card", "nrc", "passport",
            "account", "loan", "crypto", "rate", "fee", "interest",
            "branch", "hours", "deposit", "withdraw", "transfer", "block",
            "အကောင့်", "ကတ်", "ငွေ", "ချေးငွေ", "အတိုး", "အခကြေး",
            "မှတ်ပုံတင်", "ဘဏ်ခွဲ", "ပိတ်ဆို့", "လျှောက်", "စာရင်း",
            "ဖွင့်", "ပိတ်", "အသစ်", "ပြန်လုပ်", "လုပ်", "ဝန်ဆောင်မှု",
            "ဘဏ်",
        )
        return any(kw in normalized for kw in banking_keywords)

    def _generate_conversational_fallback(
        self, question: str, history: list[dict[str, str]]
    ) -> str:
        messages = build_conversational_fallback_messages(
            user_question=question, conversation_history=history
        )
        try:
            answer = self.llm.generate(
                messages,
                max_new_tokens=settings.max_new_tokens,
                do_sample=False,
                temperature=0.3,
            )
            cleaned = re.sub(r"(?i)\*?check draft.*$", "", answer, flags=re.DOTALL).strip()
            cleaned = re.sub(r"- Sentence \d+:.*$", "", cleaned, flags=re.DOTALL).strip()
            valid_lines = []
            for line in cleaned.splitlines():
                line = re.sub(r"\([^)]*\)", "", line)
                line = re.sub(r"[a-zA-Z]+", "", line)
                line = re.sub(r"['\"`*_#—\-–:]", "", line)
                line = re.sub(r"\s+", " ", line).strip()
                if line and any("\u1000" <= char <= "\u109f" for char in line):
                    valid_lines.append(line)

            cleaned_text = " ".join(valid_lines)
            repaired = self._repair_soft_issues(cleaned_text or answer)
            if repaired:
                return repaired
        except Exception as exc:
            logger.warning("Conversational fallback LLM generation failed: %s", exc)
        return UNSUPPORTED_ANSWER

    def _generate_grounded_answer(
        self,
        *,
        question: str,
        retrieved_chunks: list[dict],
        history: list[dict[str, str]],
    ) -> tuple[str, list[dict], bool]:
        valid_chunks = self._filter_chunks(retrieved_chunks)
        if not valid_chunks:
            if self._is_greeting_or_courtesy(question):
                return (
                    self._generate_conversational_fallback(
                        question=question, history=history
                    ),
                    [],
                    False,
                )
            return UNSUPPORTED_ANSWER, [], False

        sources = self._source_metadata(valid_chunks)
        messages = build_answer_messages(
            user_question=question,
            retrieved_chunks=valid_chunks,
            conversation_history=history,
        )
        answer = self.llm.generate(
            messages,
            max_new_tokens=settings.max_new_tokens,
            do_sample=False,
            temperature=0.0,
        )

        if not settings.enable_answer_validation:
            return answer, sources, True

        hard_rejection_reasons = self._hard_rejection_reasons(
            answer, valid_chunks, question
        )
        if getattr(answer, "done_reason", None) == "length":
            hard_rejection_reasons.insert(
                0,
                "Ollama stopped generation at the token limit",
            )
        if hard_rejection_reasons:
            self._log_hard_validation_failure(
                reasons=hard_rejection_reasons,
                answer=answer,
            )
            fallback = self._extractive_fallback_answer(question, valid_chunks)
            if fallback:
                return fallback, sources, True
            if self._is_greeting_or_courtesy(question):
                return (
                    self._generate_conversational_fallback(
                        question=question, history=history
                    ),
                    sources,
                    False,
                )
            return UNSUPPORTED_ANSWER, sources, False

        soft_warnings = self._soft_validation_warnings(answer)
        if soft_warnings:
            logger.info(
                "Accepted Qwen answer after deterministic soft repair. "
                "Warnings: %s.",
                "; ".join(soft_warnings),
            )
        return self._repair_soft_issues(answer), sources, True

    def chat(self, *, message: str, session_id: str | None = None) -> dict:
        if not session_id:
            session_id = self.session_manager.create_session()

        history = self.session_manager.get_history(session_id)
        session_topic = self.session_manager.get_topic(session_id)
        session_intent_query = self.session_manager.get_intent_query(session_id)
        search_query = self.query_rewriter.rewrite(
            question=message,
            history=history,
            session_topic=session_topic,
            session_intent_query=session_intent_query,
        )
        explicit_topic = self.query_rewriter.extract_subject(message)
        if explicit_topic:
            self.session_manager.set_topic(session_id, explicit_topic)
            self.session_manager.set_intent_query(session_id, search_query)
        elif search_query != message:
            self.session_manager.set_intent_query(session_id, search_query)
        retrieval = self.retriever.retrieve(search_query)
        fallback_answer: str | None = None
        if isinstance(retrieval, RetrievalResult):
            retrieved_chunks = retrieval.chunks
            fallback_answer = retrieval.fallback_answer
        else:
            retrieved_chunks = retrieval

        if not retrieved_chunks:
            if fallback_answer:
                answer, sources, grounded = fallback_answer, [], False
            elif self._is_greeting_or_courtesy(message):
                answer = self._generate_conversational_fallback(
                    question=message, history=history
                )
                sources, grounded = [], False
            else:
                answer, sources, grounded = UNSUPPORTED_ANSWER, [], False
        else:
            answer, sources, grounded = self._generate_grounded_answer(
                question=message,
                retrieved_chunks=retrieved_chunks,
                history=history,
            )

        self.session_manager.add_message(session_id, "user", message)
        self.session_manager.add_message(session_id, "assistant", answer)

        return {
            "session_id": session_id,
            "original_question": message,
            "search_query": search_query,
            "answer": answer,
            "tts_text": normalize_for_tts(answer),
            "sources": sources,
            "grounded": grounded,
        }
