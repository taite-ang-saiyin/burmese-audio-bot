from uuid import UUID

import pytest
from pydantic import ValidationError

from app.conversation.query_rewriter import QueryRewriter
from app.conversation.session_manager import SessionManager
from app.retrieval.retrieval_client import MockRetriever
from app.schemas.chat import ChatRequest
from app.services.chat_service import ChatService, UNSUPPORTED_ANSWER


ATM_ANSWER = (
    "ATM ကတ်ပျောက်ဆုံးပါက သက်ဆိုင်ရာဘဏ်ကို ချက်ချင်းဆက်သွယ်ပြီး "
    "ကတ်ကို ပိတ်ဆို့ပေးရန် တောင်းဆိုပါ။ PIN ကို ဘယ်သူ့ကိုမှ "
    "မပြောပြပါနှင့်။"
)
REPLACEMENT_QUERY = (
    "ATM ကတ်အသစ်ပြန်လည်လျှောက်ထားရန် မည်သည့်လုပ်ငန်းစဉ်များ "
    "လိုအပ်ပါသနည်း။"
)
REPLACEMENT_ANSWER = (
    "ATM ကတ်အသစ်လျှောက်ထားရန် နီးစပ်ရာဘဏ်ခွဲကို သွားပြီး "
    "ကိုယ်ရေးအချက်အလက် အတည်ပြုစစ်ဆေးမှု ပြုလုပ်ပါ။ PIN ကို "
    "ဘဏ်ဝန်ထမ်းအပါအဝင် ဘယ်သူ့ကိုမှ မပြောပြပါနှင့်။"
)


class SequenceLLM:
    def __init__(self, *responses: str) -> None:
        self.responses = list(responses)
        self.calls: list[dict] = []

    def generate(self, messages, **kwargs):
        self.calls.append({"messages": messages, "kwargs": kwargs})
        return self.responses.pop(0)


class FailingRewriteLLM:
    def generate(self, messages, **kwargs):
        raise RuntimeError("Ollama is unavailable")


class SemanticMockRetriever(MockRetriever):
    def retrieve(self, query):
        if "ATM ကတ်" in query and "အသစ်ပြန်လုပ်" in query:
            return super().retrieve(REPLACEMENT_QUERY)
        return super().retrieve(query)


class EmptyRecordingRetriever:
    def __init__(self):
        self.queries = []

    def retrieve(self, query):
        self.queries.append(query)
        return []


def _service(llm, retriever=None) -> ChatService:
    return ChatService(
        llm=llm,
        retriever=retriever or MockRetriever(),
        session_manager=SessionManager(max_messages=6, db_path=":memory:"),
        query_rewriter=QueryRewriter(llm),
    )


def test_placeholder_session_id_is_rejected_before_chat_processing():
    with pytest.raises(ValidationError):
        ChatRequest(message="ATM ကတ်ပျောက်သွားတယ်။", session_id="string")


def test_valid_session_id_and_trimmed_message_are_accepted():
    request = ChatRequest(
        message="  ATM ကတ်ပျောက်သွားတယ်။  ",
        session_id="123e4567-e89b-42d3-a456-426614174000",
    )

    assert request.message == "ATM ကတ်ပျောက်သွားတယ်။"
    assert request.session_id == UUID("123e4567-e89b-42d3-a456-426614174000")


def test_ambiguous_follow_up_is_rewritten_without_an_extra_model_call():
    llm = SequenceLLM(ATM_ANSWER, REPLACEMENT_ANSWER)
    service = _service(llm, SemanticMockRetriever())

    first = service.chat(message="ATM ကတ် ပျောက်သွားရင် ဘာလုပ်ရမလဲ။")
    second = service.chat(
        message="ဒါဆို အသစ်ပြန်လုပ်ဖို့ ဘာလိုလဲ။",
        session_id=first["session_id"],
    )

    assert first["sources"][0]["section"] == "Card Loss Procedure"
    assert second["search_query"] == "ATM ကတ် အသစ်ပြန်လုပ်ဖို့ ဘာလိုလဲ။"
    assert second["sources"][0]["section"] == "Card Replacement"
    assert second["answer"] == REPLACEMENT_ANSWER
    assert second["grounded"] is True
    assert len(llm.calls) == 2
    assert all(call["kwargs"]["do_sample"] is False for call in llm.calls)
    assert all(call["kwargs"]["temperature"] == 0.0 for call in llm.calls)


def test_ambiguous_question_in_a_new_session_is_not_given_old_context():
    llm = SequenceLLM(REPLACEMENT_QUERY)
    result = _service(llm).chat(message="ဒါဆို အသစ်ပြန်လုပ်ဖို့ ဘာလိုလဲ။")

    assert result["search_query"] == "ဒါဆို အသစ်ပြန်လုပ်ဖို့ ဘာလိုလဲ။"
    assert result["answer"] == UNSUPPORTED_ANSWER
    assert result["grounded"] is False
    assert llm.calls == []


def test_standalone_subject_question_is_not_contaminated_by_history():
    llm = SequenceLLM(ATM_ANSWER)
    service = _service(llm)
    first = service.chat(message="ATM ကတ် ပျောက်သွားရင် ဘာလုပ်ရမလဲ။")

    question = (
        "ဖုန်းနံပါတ်ပြောင်းသွားလို့ Mobile Banking အကောင့်မှာ "
        "ဖုန်းနံပါတ် ဘယ်လိုချိန်းရမလဲ။"
    )
    second = service.chat(message=question, session_id=first["session_id"])

    assert second["search_query"] == question
    assert second["grounded"] is False
    assert second["sources"] == []
    assert len(llm.calls) == 1


def test_deterministic_rewrite_uses_history_without_calling_the_llm():
    question = "ဒါဆို ဘာဆက်လုပ်ရမလဲ။"
    history = [{"role": "user", "content": "ATM ကတ်ပျောက်သွားတယ်။"}]

    result = QueryRewriter(FailingRewriteLLM()).rewrite(question, history)

    assert result == "ATM ကတ်ပျောက်သွားတယ်။"


def test_reference_marker_and_postposition_are_removed_from_follow_up():
    result = QueryRewriter(FailingRewriteLLM()).rewrite(
        "အဲဒါကို ဘယ်လိုလုပ်ရမလဲ။",
        [{"role": "user", "content": "ATM ကတ်ပျောက်သွားတယ်။"}],
    )

    assert result == "ATM ကတ်ပျောက်သွားတယ်။"


def test_follow_up_recovers_topic_after_service_restart(tmp_path):
    db_path = tmp_path / "chat-history.sqlite3"
    first_manager = SessionManager(max_messages=6, db_path=db_path)
    first_retriever = EmptyRecordingRetriever()
    first_service = ChatService(
        llm=FailingRewriteLLM(),
        retriever=first_retriever,
        session_manager=first_manager,
        query_rewriter=QueryRewriter(FailingRewriteLLM()),
    )
    first = first_service.chat(message="ATM ကတ်ပျောက်သွားရင် ဘာလုပ်ရမလဲ။")
    first_manager.close()

    restarted_manager = SessionManager(max_messages=6, db_path=db_path)
    restarted_retriever = EmptyRecordingRetriever()
    restarted_service = ChatService(
        llm=FailingRewriteLLM(),
        retriever=restarted_retriever,
        session_manager=restarted_manager,
        query_rewriter=QueryRewriter(FailingRewriteLLM()),
    )
    follow_up = restarted_service.chat(
        message="အဲဒါကို ဘယ်လိုလုပ်ရမလဲ။",
        session_id=first["session_id"],
    )

    original_query = "ATM ကတ်ပျောက်သွားရင် ဘာလုပ်ရမလဲ။"
    assert follow_up["search_query"] == original_query
    assert restarted_retriever.queries == [original_query]
    assert restarted_manager.get_topic(first["session_id"]) == "ATM ကတ်"
    assert restarted_manager.get_intent_query(first["session_id"]) == original_query
    restarted_manager.close()
