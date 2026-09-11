import pytest

from app.config import settings
from app.conversation.query_rewriter import QueryRewriter
from app.llm.ollama_service import OllamaGeneration
from app.conversation.session_manager import SessionManager
from app.normalization.burmese_normalizer import normalize_for_tts
from app.retrieval.retrieval_client import MockRetriever, RetrievalResult
from app.services.chat_service import ChatService, UNSUPPORTED_ANSWER


@pytest.fixture(autouse=True)
def enable_answer_validation_for_tests():
    old = settings.enable_answer_validation
    object.__setattr__(settings, "enable_answer_validation", True)
    yield
    object.__setattr__(settings, "enable_answer_validation", old)




EXPECTED_ATM_ANSWER = (
    "ATM ကတ်ပျောက်ဆုံးပါက Customer Service Hotline ကို "
    "ချက်ချင်းဆက်သွယ်ပေးပါ။ ကတ်ကို မသက်ဆိုင်သူများ "
    "အသုံးမပြုနိုင်စေရန် ယာယီပိတ်ထားခြင်း (temporary block) "
    "ပြုလုပ်ရန် လိုအပ်ပါတယ်။"
)

GENERATED_PERSON1_ATM_ANSWER = (
    "ATM ကတ်ပျောက်ဆုံးပါက သက်ဆိုင်ရာဘဏ်ကို ချက်ချင်းဖုန်းဆက်ပြီး "
    "ကတ်ကို ပိတ်ဆို့ (Block) ပေးရန် တောင်းဆိုပါ။ ဘဏ်ခွဲသို့သွားပါက "
    "မှတ်ပုံတင်မူရင်း ယူဆောင်သွားပါ။"
)

EXPECTED_REPLACEMENT_ANSWER = (
    "မရပါ။ PIN ကို ဘဏ်ဝန်ထမ်းအပါအဝင် မည်သူ့ကိုမျှ "
    "မပြောပြပါနှင့်။ ATM ကတ်အသစ်ပြန်လည်လျှောက်ထားရန် "
    "နီးစပ်ရာဘဏ်ခွဲသို့ သွားရောက်ပြီး identity verification "
    "ပြုလုပ်ပေးပါ။"
)

MALFORMED_ANSWER = (
    "ယောက်ပါ အတည်ပြုထားသော ကတ်ပျောက်ဆုံးပါက ဘာလုပ်ရမည်ဆိုရင် "
    "ကတ်ကို ကတ်ပျောက်ဆုံးပါက သုံးသံ့ပြောက်လုပ်ရန် သို့မှ သို့ "
    "ချက်ချင်းဆက်သွယ်၍ ကတ်ကို လိုအပ်သော ကုံးပြုလုပ်ရမည်ဆိုရင်"
)

CORRUPTED_MULTILINGUAL_ANSWER = (
    "ကတ်ပျောက်သွားရင် အခုလိုဆိုပါတယ်။ 09-123456789 ဖုန်းဆက်ပြီး "
    "ကတ်ကိုပိတ်ဆို့ခိုင်းရမယ်၊ သို့မဟုတ်则 Mobile Banking App မှ "
    "Card Management ထဲက Block Card နှိပ်ပါ။ အသစ်လျှောက်ချင်ရင် "
    "နီးစပ်တဲ့ဘဏ်ခွဲမှာ NRC မူရင်းယူဆောင်လာပြီး လိုက်ထားရပါမည်။"
)

BROKEN_BURMESE_ACTION_ANSWER = (
    "ကတ်ပျောက်သွားရင် 09-123456789 ကို ဖုန်းဆက်ပြီး ကတ်ကို "
    "ပိတ်ဆို့ခိုင်းရမယ်။ Mobile Banking App မှ Card Management ထဲက "
    "Block Card ကို နှိပ်ပါ။ အသစ်လျှောက်ချင်ရင် နီးစပ်တဲ့ဘဏ်ခွဲမှာ "
    "NRC မူရင်းယူဆောင်လာပြီး လိုက်ထားရပါမည်။"
)

INCOMPLETE_DOCUMENT_ANSWER = (
    "ကတ်အသစ်ထုတ်ယူရန်အတွက် မိတ္တူ NRC မူရင်းကို ယူဆောင်လာပါ။ "
    "နိုင်ငံခြားသားဖြစ်ပါက Passport မူရင်းနှင့် Stay Permit ကိုလည်း "
    "ယူဆောင်လာပါ။"
)

COMPLETE_DOCUMENT_ANSWER = (
    "ဘဏ်ခွဲတွင် ကတ်အသစ်ထုတ်ယူရန် နိုင်ငံသားဖြစ်ပါက NRC မူရင်းကို "
    "ယူဆောင်လာပြီး မိတ္တူကို လက်မခံပါ။ နိုင်ငံခြားသားဖြစ်ပါက "
    "Passport မူရင်းနှင့် Stay Permit ကို ယူဆောင်လာပါ။ "
    "ကိုယ်စားလှယ်ဖြင့် ထုတ်ယူပါက တရားဝင် Power of Attorney နှင့် "
    "ကိုယ်စားလှယ်၏ NRC မူရင်းကို ယူဆောင်လာပါ။"
)

BURMESE_EQUIVALENT_DOCUMENT_ANSWER = (
    "ဘဏ်ခွဲတွင် ကတ်အသစ်ထုတ်ယူရန် နိုင်ငံသားစိစစ်ရေးကတ်ပြား မူရင်းကို "
    "ယူဆောင်လာပြီး မိတ္တူကို လက်မခံပါ။ နိုင်ငံခြားသားဖြစ်ပါက "
    "နိုင်ငံကူးလက်မှတ် မူရင်းနှင့် နေထိုင်ခွင့်လက်မှတ်ကို ယူဆောင်လာပါ။ "
    "ကိုယ်စားလှယ်ဖြင့် ထုတ်ယူပါက တရားဝင် ကိုယ်စားလှယ်လွှဲစာနှင့် "
    "ကိုယ်စားလှယ်၏ နိုင်ငံသားစိစစ်ရေးကတ်ပြား မူရင်းကို ယူဆောင်လာပါ။"
)

ITEM_ASSOCIATION_INCOMPLETE_ANSWER = (
    "နိုင်ငံသားဖြစ်ပါက NRC မူရင်းကို ယူဆောင်လာပြီး မိတ္တူကို လက်မခံပါ။ "
    "နိုင်ငံခြားသားဖြစ်ပါက Passport မူရင်းနှင့် Stay Permit ကို ယူဆောင်လာပါ။ "
    "ကိုယ်စားလှယ်ဖြင့် ထုတ်ယူပါက Power of Attorney လိုအပ်ပါသည်။"
)

VALID_REPEATED_BANKING_TEMPLATE_ANSWER = (
    "တစ်နေ့လျှင် ငွေထုတ်ယူနိုင်မှုအတွက် ပမာဏကန့်သတ်ချက်များကို "
    "ဘဏ်ရဲ့ ATM စက်အမျိုးအစားပေါ် မူတည်ပါသည်။ Classic Debit Card "
    "အတွက် တစ်နေ့လျှင် အများဆုံး ၁၀ သိန်းအထိ ထုတ်ယူနိုင်ပါသည်။ "
    "Gold / Platinum Card အတွက် တစ်နေ့လျှင် အများဆုံး ၃၀ သိန်းအထိ "
    "ထုတ်ယူနိုင်ပါသည်။ တစ်ကြိမ်လျှင် အများဆုံး ၃ သိန်းအထိ "
    "ထုတ်ယူနိုင်ပါသည်။"
)

INCOMPLETE_MOBILE_BANKING_ANSWER = (
    "Mobile Banking App ကို App Store သို့မဟုတ် Google Play Store မှ "
    "ဒေါင်းလုဒ်လုပ်ပြီး Register New Account ကိုနှိပ်ပါ။ "
    "ဘဏ်အကောင့်နံပါတ်နှင့် ဖုန်းနံပါတ်ကို ရိုက်ထည့်ပြီး OTP ကို "
    "အတည်ပြုပါ။ NRC မူရင်းယူပြီး ဘဏ်ခွဲတွင် လျှောက်ထားနိုင်ပါသည်။"
)

COMPLETE_MOBILE_BANKING_ANSWER = (
    "Mobile Banking အကောင့်စဖွင့်ဖို့ Mobile Banking App ကို App Store "
    "ဒါမှမဟုတ် Google Play Store ကနေ ဒေါင်းလုဒ်လုပ်ပေးပါ။ "
    "\"Register New Account\" ကိုနှိပ်ပြီး ဘဏ်အကောင့်နံပါတ်နဲ့ "
    "ဘဏ်မှာစာရင်းသွင်းထားတဲ့ ဖုန်းနံပါတ်ကို ရိုက်ထည့်ပေးပါ။ "
    "ဖုန်းကိုရောက်လာတဲ့ OTP ဂဏန်း ၆ လုံးကို ရိုက်ထည့်ပြီး အတည်ပြုပေးပါ။ "
    "အက်ပ်ကနေလျှောက်လို့ အဆင်မပြေရင် NRC မူရင်းယူပြီး "
    "နီးစပ်ရာဘဏ်ခွဲမှာ သွားလျှောက်နိုင်ပါတယ်။"
)


class SequenceLLM:
    def __init__(self, *answers):
        self.answers = list(answers)
        self.calls = []

    def generate(self, messages, **kwargs):
        self.calls.append({"messages": messages, "kwargs": kwargs})
        return self.answers.pop(0)


class LengthTruncatedLLM(SequenceLLM):
    def generate(self, messages, **kwargs):
        answer = super().generate(messages, **kwargs)
        return OllamaGeneration(answer, done_reason="length")


class EmptyRetriever:
    def retrieve(self, query):
        return []


class PolicyRetriever:
    def retrieve(self, query):
        return [
            {
                "text": (
                    "ATM ကတ်ပျောက်ဆုံးပါက Customer Service Hotline ကို "
                    "ချက်ချင်းဆက်သွယ်၍ ကတ်ကို temporary block "
                    "ပြုလုပ်ရန် လိုအပ်သည်။"
                ),
                "document": "ATM_Card_Policy.pdf",
                "page": 5,
                "section": "Lost Card",
                "score": 0.94,
            }
        ]


class NumberedAtmProcedureRetriever:
    def retrieve(self, query):
        return [
            {
                "question": "ATM ကတ် ပျောက်ဆုံးသွားပါက ဘာလုပ်ရမလဲ။",
                "text": (
                    "1. Customer Service Hotline 09-123456789 ကို ဖုန်းဆက်ပြီး "
                    "ကတ်ကို ပိတ်ဆို့ (Block) ရပါမည်။\n"
                    "2. Mobile Banking App မှ Card Management ကိုဝင်ပြီး "
                    "Block Card ကို နှိပ်နိုင်ပါသည်။\n"
                    "3. ကတ်အသစ်လျှောက်ထားရန် နီးစပ်ရာဘဏ်ခွဲသို့ "
                    "လူကိုယ်တိုင် NRC မူရင်းယူဆောင်၍ သွားရပါမည်။"
                ),
                "document": "ATM_Services_FAQ.md",
                "page": 1,
                "section": "ATM Card Loss and Blocking",
                "score": 0.1895,
            }
        ]


class Person1LowScoreRetriever:
    def retrieve(self, query):
        return RetrievalResult(
            chunks=[
                {
                    "text": (
                        "ATM ကတ်ပျောက်ဆုံးပါက ဘဏ်ကို ချက်ချင်းဆက်သွယ်ပါ။"
                    ),
                    "document": "policy.md",
                    "page": 1,
                    "section": "Lost card",
                    "score": 0.18987220353917703,
                }
            ],
            has_context=True,
            confidence="high",
        )


class Person1FallbackRetriever:
    def retrieve(self, query):
        return RetrievalResult(
            chunks=[],
            fallback_answer=(
                "တောင်းပန်ပါတယ်။ သက်ဆိုင်ရာ ဘဏ်ဝန်ဆောင်မှုအချက်အလက်ကို "
                "မတွေ့ရှိပါ။"
            ),
            has_context=False,
            confidence="low",
        )


class ReplacementDocumentsRetriever:
    def retrieve(self, query):
        return RetrievalResult(
            chunks=[
                {
                    "text": (
                        "# Required Verification Documents\n"
                        "ဘဏ်ခွဲတွင် ကတ်အသစ် ထုတ်ယူရာတွင် အောက်ပါ "
                        "စာရွက်စာတမ်းများ မူရင်း ယူဆောင်လာရပါမည်-\n"
                        "1. နိုင်ငံသား စိစစ်ရေး ကတ်ပြား (NRC) မူရင်း "
                        "(မိတ္တူ လက်မခံပါ)။\n"
                        "2. နိုင်ငံခြားသား ဖြစ်ပါက Passport မူရင်း နှင့် "
                        "Stay Permit။\n"
                        "3. ကိုယ်စားလှယ်ဖြင့် ထုတ်ယူပါက တရားဝင် "
                        "ကိုယ်စားလှယ်လွှဲစာ (Power of Attorney) နှင့် "
                        "ကိုယ်စားလှယ်၏ NRC မူရင်း။"
                    ),
                    "document": "card_replacement_policy.md",
                    "page": 1,
                    "section": "Required Verification Documents",
                    "score": 0.18981365740119277,
                }
            ],
            has_context=True,
            confidence="high",
        )


class MobileBankingRegistrationRetriever:
    def retrieve(self, query):
        return RetrievalResult(
            chunks=[
                {
                    "text": (
                        "Mobile Banking Application ကို စတင်အသုံးပြုရန် "
                        "အောက်ပါအတိုင်း ဆောင်ရွက်နိုင်ပါသည်။\n"
                        "1. **Self-Registration (အက်ပ်မှ တိုက်ရိုက်လျှောက်ထားခြင်း):**\n"
                        "   * Mobile Banking App ကို App Store သို့မဟုတ် "
                        "Google Play Store မှ ဒေါင်းလုဒ်လုပ်ပါ။\n"
                        "   * \"Register New Account\" ကို နှိပ်ပြီး မိမိ၏ "
                        "ဘဏ်အကောင့်နံပါတ် နှင့် ဘဏ်တွင် စာရင်းသွင်းထားသော "
                        "ဖုန်းနံပါတ် ကို ရိုက်ထည့်ပါ။\n"
                        "   * ဖုန်းသို့ ရောက်ရှိလာသော OTP (One-Time Password) "
                        "ဂဏန်း (၆) လုံးကို ရိုက်ထည့်၍ အတည်ပြုပါ။\n"
                        "2. **Branch Registration (ဘဏ်ခွဲတွင် လျှောက်ထားခြင်း):**\n"
                        "- အက်ပ်မှ လျှောက်ထားရာတွင် အဆင်မပြေပါက မှတ်ပုံတင် "
                        "(NRC) မူရင်း ယူဆောင်၍ နီးစပ်ရာ ဘဏ်ခွဲတွင် "
                        "သွားရောက် လျှောက်ထားနိုင်ပါသည်။"
                    ),
                    "document": "mobile_banking_guide.md",
                    "page": 1,
                    "section": "Mobile Banking Registration",
                    "score": 0.19,
                }
            ],
            has_context=True,
            confidence="high",
        )


def _service(retriever, llm):
    return ChatService(
        llm=llm,
        retriever=retriever,
        session_manager=SessionManager(db_path=":memory:"),
        query_rewriter=QueryRewriter(llm),
    )


def test_no_context_returns_safe_unsupported_answer_without_calling_llm():
    llm = SequenceLLM(EXPECTED_ATM_ANSWER)
    result = _service(EmptyRetriever(), llm).chat(message="loan rate?")

    assert result["answer"] == UNSUPPORTED_ANSWER
    assert result["grounded"] is False
    assert result["sources"] == []
    assert llm.calls == []


def test_person1_no_context_answer_is_returned_without_calling_llm():
    llm = SequenceLLM(EXPECTED_ATM_ANSWER)
    result = _service(Person1FallbackRetriever(), llm).chat(message="မသိသောမေးခွန်း")

    assert result["answer"] == (
        "တောင်းပန်ပါတယ်။ သက်ဆိုင်ရာ ဘဏ်ဝန်ဆောင်မှုအချက်အလက်ကို "
        "မတွေ့ရှိပါ။"
    )
    assert result["grounded"] is False
    assert result["sources"] == []
    assert llm.calls == []


def test_person1_low_numeric_score_is_not_filtered_by_person2():
    llm = SequenceLLM(GENERATED_PERSON1_ATM_ANSWER)
    result = _service(Person1LowScoreRetriever(), llm).chat(
        message="ATM ကတ်ပျောက်သွားရင် ဘာလုပ်ရမလဲ။"
    )

    assert result["answer"] == GENERATED_PERSON1_ATM_ANSWER
    assert result["grounded"] is True
    assert result["sources"][0]["score"] == pytest.approx(0.18987220353917703)
    assert len(llm.calls) == 1


def test_incomplete_numbered_policy_uses_complete_rag_fallback_without_retry():
    llm = SequenceLLM(INCOMPLETE_DOCUMENT_ANSWER)
    result = _service(ReplacementDocumentsRetriever(), llm).chat(
        message=(
            "ကတ်အသစ် ထုတ်ယူရာတွင် မည်သည့် စာရွက်စာတမ်းများ "
            "ယူဆောင်လာရမည်နည်း။"
        )
    )

    assert "NRC" in result["answer"]
    assert "မိတ္တူ လက်မခံပါ" in result["answer"]
    assert "Passport" in result["answer"]
    assert "Stay Permit" in result["answer"]
    assert "Power of Attorney" in result["answer"]
    assert "ကိုယ်စားလှယ်၏ NRC မူရင်း" in result["answer"]
    assert result["grounded"] is True
    assert len(llm.calls) == 1
    assert "ရှင့်" in result["tts_text"]
    assert "နော်" in result["tts_text"]


def test_burmese_document_name_equivalents_pass_without_retry():
    llm = SequenceLLM(BURMESE_EQUIVALENT_DOCUMENT_ANSWER)
    result = _service(ReplacementDocumentsRetriever(), llm).chat(
        message=(
            "ကတ်အသစ် ထုတ်ယူရာတွင် မည်သည့် စာရွက်စာတမ်းများ "
            "ယူဆောင်လာရမည်နည်း။"
        )
    )

    assert result["answer"] == BURMESE_EQUIVALENT_DOCUMENT_ANSWER
    assert result["grounded"] is True
    assert len(llm.calls) == 1


def test_numbered_item_facts_must_stay_associated_in_one_sentence():
    chunks = ReplacementDocumentsRetriever().retrieve("documents").chunks

    reasons = ChatService._answer_rejection_reasons(
        ITEM_ASSOCIATION_INCOMPLETE_ANSWER,
        chunks,
        "ကတ်အသစ်ထုတ်ယူရန် ဘာလိုမလဲ။",
    )

    assert any("စာရင်းအချက် 3" in reason for reason in reasons)
    assert any("NRC" in reason and "မူရင်း" in reason for reason in reasons)


def test_normal_repeated_banking_limit_phrases_are_not_hard_rejected():
    chunks = [
        {
            "text": "ATM daily withdrawal limits for Classic and Gold cards.",
            "score": 0.9,
        }
    ]

    reasons = ChatService._hard_rejection_reasons(
        VALID_REPEATED_BANKING_TEMPLATE_ANSWER,
        chunks,
        "ATM ကနေ တစ်နေ့ ဘယ်လောက်ထုတ်လို့ရလဲ။",
    )

    assert reasons == []


def test_duplicate_full_sentence_is_only_a_soft_warning():
    repeated = (
        "ATM ကတ်ကို ချက်ချင်း ယာယီပိတ်ထားပေးပါ။ "
        "ATM ကတ်ကို ချက်ချင်း ယာယီပိတ်ထားပေးပါ။"
    )

    reasons = ChatService._answer_rejection_reasons(
        repeated,
        [{"text": "ATM ကတ်ကို ယာယီပိတ်ထားပါ။", "score": 0.9}],
        "ATM ကတ်ပျောက်ရင် ဘာလုပ်ရမလဲ။",
    )

    assert "answer repeats an entire sentence" in reasons
    assert ChatService._is_bad_answer(
        repeated,
        [{"text": "ATM ကတ်ကို ယာယီပိတ်ထားပါ။", "score": 0.9}],
        "ATM ကတ်ပျောက်ရင် ဘာလုပ်ရမလဲ။",
    ) is False


def test_nested_mobile_banking_facts_use_complete_rag_fallback_without_retry():
    llm = SequenceLLM(INCOMPLETE_MOBILE_BANKING_ANSWER)
    result = _service(MobileBankingRegistrationRetriever(), llm).chat(
        message="Mobile Banking အကောင့် ဘယ်လိုလျှောက်လို့ရလဲ။"
    )

    assert "App Store" in result["answer"]
    assert "Google Play Store" in result["answer"]
    assert "Register New Account" in result["answer"]
    assert "ဘဏ်တွင် စာရင်းသွင်းထားသော ဖုန်းနံပါတ်" in result["answer"]
    assert "OTP (One-Time Password) ဂဏန်း (၆) လုံး" in result["answer"]
    assert "အဆင်မပြေပါက" in result["answer"]
    assert "NRC" in result["answer"]
    assert result["grounded"] is True
    assert len(llm.calls) == 1
    assert "ရှင့်" in result["tts_text"]
    assert "နော်" in result["tts_text"]


def test_rejected_answer_logs_reason_and_raw_output(caplog):
    llm = SequenceLLM(INCOMPLETE_DOCUMENT_ANSWER)

    with caplog.at_level("WARNING"):
        _service(ReplacementDocumentsRetriever(), llm).chat(
            message=(
                "ကတ်အသစ် ထုတ်ယူရာတွင် မည်သည့် စာရွက်စာတမ်းများ "
                "ယူဆောင်လာရမည်နည်း။"
            )
        )

    assert "using RAG extractive fallback" in caplog.text
    assert "missing numbered-list facts" in caplog.text
    assert INCOMPLETE_DOCUMENT_ANSWER in caplog.text
    assert len(llm.calls) == 1


def test_mock_person1_context_is_sent_to_the_model_for_generation():
    llm = SequenceLLM(GENERATED_PERSON1_ATM_ANSWER)
    result = _service(MockRetriever(), llm).chat(
        message="ATM ကတ် ပျောက်သွားရင် ဘာလုပ်ရမလဲ။"
    )

    assert result["answer"] == GENERATED_PERSON1_ATM_ANSWER
    assert result["tts_text"] == normalize_for_tts(GENERATED_PERSON1_ATM_ANSWER)
    assert result["tts_text"] != result["answer"]
    assert result["grounded"] is True
    assert result["sources"][0] == {
        "document": "ATM_Services_FAQ_v1.pdf",
        "page": "3",
        "section": "Card Loss Procedure",
        "score": 0.885,
    }
    assert len(result["sources"]) == 2
    assert len(llm.calls) == 1
    assert "chunk_9f823a" not in result["answer"]


def test_pin_replacement_question_uses_generated_security_answer():
    llm = SequenceLLM(EXPECTED_REPLACEMENT_ANSWER)
    result = _service(MockRetriever(), llm).chat(
        message="ကျွန်တော့် PIN ကို ပြောပေးရင် ကတ်ပြန်လုပ်ပေးနိုင်လား။"
    )

    assert result["answer"] == EXPECTED_REPLACEMENT_ANSWER
    assert result["tts_text"] == normalize_for_tts(EXPECTED_REPLACEMENT_ANSWER)
    assert result["tts_text"] != result["answer"]
    assert result["grounded"] is True
    assert result["sources"] == [
        {
            "document": "ATM_Card_Policy.pdf",
            "page": "6",
            "section": "Card Replacement",
            "score": 0.91,
        }
    ]
    assert len(llm.calls) == 1


def test_malformed_generation_uses_source_fallback_without_retry():
    llm = SequenceLLM(MALFORMED_ANSWER)
    result = _service(PolicyRetriever(), llm).chat(
        message="ATM ကတ်ပျောက်သွားရင် ဘာလုပ်ရမလဲ။"
    )

    assert result["answer"] == (
        "ATM ကတ်ပျောက်ဆုံးပါက Customer Service Hotline ကို "
        "ချက်ချင်းဆက်သွယ်၍ ကတ်ကို temporary block ပြုလုပ်ရန် လိုအပ်သည်။"
    )
    assert result["grounded"] is True
    assert len(llm.calls) == 1
    assert all(call["kwargs"]["do_sample"] is False for call in llm.calls)
    assert all(call["kwargs"]["temperature"] == 0.0 for call in llm.calls)


def test_foreign_script_generation_uses_clean_rag_fallback_without_retry(caplog):
    llm = SequenceLLM(CORRUPTED_MULTILINGUAL_ANSWER)

    with caplog.at_level("WARNING"):
        result = _service(PolicyRetriever(), llm).chat(
            message="ATM ကတ်ပျောက်သွားရင် ဘာလုပ်ရမလဲ။"
        )

    assert result["answer"] == (
        "ATM ကတ်ပျောက်ဆုံးပါက Customer Service Hotline ကို "
        "ချက်ချင်းဆက်သွယ်၍ ကတ်ကို temporary block ပြုလုပ်ရန် လိုအပ်သည်။"
    )
    assert "则" not in result["answer"]
    assert "则" not in result["tts_text"]
    assert "လိုက်ထား" not in result["answer"]
    assert "လိုက်ထား" not in result["tts_text"]
    assert "unexpected foreign script" in caplog.text
    assert "filler introduction" in caplog.text
    assert result["grounded"] is True
    assert len(llm.calls) == 1


def test_damaged_burmese_action_uses_numbered_rag_fallback_without_retry():
    llm = SequenceLLM(BROKEN_BURMESE_ACTION_ANSWER)

    result = _service(NumberedAtmProcedureRetriever(), llm).chat(
        message="ATM ကတ်ပျောက်သွားရင် ဘာလုပ်ရမလဲ။"
    )

    assert "Customer Service Hotline" in result["answer"]
    assert "Card Management" in result["answer"]
    assert "လူကိုယ်တိုင်" in result["answer"]
    assert "လျှောက်ထားရန်" in result["answer"]
    assert "လိုက်ထား" not in result["answer"]
    assert "လိုက်ထား" not in result["tts_text"]
    assert result["grounded"] is True
    assert len(llm.calls) == 1


def test_natural_card_answer_can_omit_repeated_atm_term_without_fallback():
    natural_answer = (
        "ကတ်ပျောက်ဆုံးသွားရင် ဘဏ် Hotline ကို ချက်ချင်းဖုန်းဆက်ပြီး "
        "ကတ်ကို ပိတ်ဆို့ခိုင်းပေးပါ။ ဘဏ်ခွဲမှာ ကတ်အသစ်လျှောက်ဖို့ "
        "မှတ်ပုံတင်မူရင်း ယူသွားပေးပါရှင့်။"
    )
    llm = SequenceLLM(natural_answer)

    result = _service(PolicyRetriever(), llm).chat(
        message="ATM ကတ်ပျောက်သွားရင် ဘာလုပ်ရမလဲ။"
    )

    assert result["answer"] == natural_answer
    assert result["grounded"] is True
    assert len(llm.calls) == 1


def test_source_fallback_remains_grounded_after_hard_validation_failure():
    llm = SequenceLLM(MALFORMED_ANSWER)
    result = _service(PolicyRetriever(), llm).chat(
        message="ATM ကတ်ပျောက်သွားရင် ဘာလုပ်ရမလဲ။"
    )

    assert "Customer Service Hotline" in result["answer"]
    assert "temporary block" in result["answer"]
    assert result["grounded"] is True
    assert result["sources"][0]["document"] == "ATM_Card_Policy.pdf"
    assert len(llm.calls) == 1


def test_token_truncated_generation_uses_complete_rag_fallback_without_retry():
    llm = LengthTruncatedLLM(
        "ATM ကတ်ပျောက်ဆုံးပါက Hotline ကို ဖုန်းဆက်ပါ။ "
        "ဘဏ်ခွဲကို NRC မူရင်းယူပြီး လူကိုယ်တိုင် လာရောက်လျှောက"
    )

    result = _service(PolicyRetriever(), llm).chat(
        message="ATM ကတ်ပျောက်သွားရင် ဘာလုပ်ရမလဲ။"
    )

    assert "Customer Service Hotline" in result["answer"]
    assert "temporary block" in result["answer"]
    assert "လျှောက" not in result["answer"]
    assert "လျှောက" not in result["tts_text"]
    assert result["grounded"] is True
    assert len(llm.calls) == 1


def test_condition_wording_equivalents_do_not_cause_hard_rejection():
    chunks = MobileBankingRegistrationRetriever().retrieve("mobile").chunks
    answer = COMPLETE_MOBILE_BANKING_ANSWER.replace(
        "အက်ပ်ကနေလျှောက်လို့ အဆင်မပြေရင်",
        "အက်ပ်မှ လျှောက်ထားရာမှာ အဆင်မပြေတဲ့အခါ",
    )

    reasons = ChatService._hard_rejection_reasons(
        answer,
        chunks,
        "Mobile Banking အကောင့် ဘယ်လိုလျှောက်လို့ရလဲ။",
    )

    assert reasons == []


def test_security_secret_request_is_a_hard_validation_failure():
    reasons = ChatService._hard_rejection_reasons(
        "ကတ်ပြန်လုပ်ရန် PIN ကို ဘဏ်ဝန်ထမ်းအား ပြောပေးပါ။",
        [{"text": "PIN ကို မည်သူ့ကိုမျှ မပြောပါနှင့်။", "score": 0.9}],
        "PIN ပြောရမလား။",
    )

    assert "answer asks the customer to disclose a security secret" in reasons


def test_disabled_validation_returns_direct_llm_output():
    object.__setattr__(settings, "enable_answer_validation", False)
    try:
        llm = SequenceLLM(MALFORMED_ANSWER)
        result = _service(PolicyRetriever(), llm).chat(
            message="ATM ကတ်ပျောက်သွားရင် ဘာလုပ်ရမလဲ။"
        )
        assert result["answer"] == MALFORMED_ANSWER
    finally:
        object.__setattr__(settings, "enable_answer_validation", True)


