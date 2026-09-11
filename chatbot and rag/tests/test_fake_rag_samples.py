import json
from pathlib import Path

import pytest

from app.conversation.query_rewriter import QueryRewriter
from app.conversation.session_manager import SessionManager
from app.normalization.burmese_normalizer import normalize_for_tts
from app.retrieval.retrieval_client import MockRetriever
from app.services.chat_service import ChatService, UNSUPPORTED_ANSWER


PROJECT_ROOT = Path(__file__).resolve().parents[1]
QUESTIONS_PATH = PROJECT_ROOT / "data" / "mock_banking_questions.json"
RESPONSES_PATH = PROJECT_ROOT / "data" / "mock_person1_rag_responses.json"
SAMPLES = json.loads(QUESTIONS_PATH.read_text(encoding="utf-8"))["samples"]
RESPONSES = json.loads(RESPONSES_PATH.read_text(encoding="utf-8"))["responses"]

GENERATED_TEST_ANSWER = (
    "ATM၊ OTP၊ PIN နှင့် CVV ဆိုင်ရာ လုပ်ဆောင်ချက်ကို ရရှိထားသော "
    "ဘဏ်အချက်အလက်အတိုင်း ဆောင်ရွက်ပေးပါ။ မသေချာပါက "
    "တရားဝင် ဘဏ်ဝန်ဆောင်မှုဌာနကို ဆက်သွယ်ပေးပါ။"
)


class GeneratedAnswerLLM:
    def __init__(self) -> None:
        self.calls: list[dict] = []

    def generate(self, messages, **kwargs):
        self.calls.append({"messages": messages, "kwargs": kwargs})
        return GENERATED_TEST_ANSWER


def _service(retriever):
    llm = GeneratedAnswerLLM()
    return (
        ChatService(
            llm=llm,
            retriever=retriever,
            session_manager=SessionManager(db_path=":memory:"),
            query_rewriter=QueryRewriter(llm),
        ),
        llm,
    )


def test_person1_fixtures_and_question_ids_are_unique_and_have_no_approved_answer():
    retriever = MockRetriever()
    chunk_ids = [chunk["chunk_id"] for chunk in retriever.chunks]
    sample_ids = [sample["id"] for sample in SAMPLES]
    raw_response_text = RESPONSES_PATH.read_text(encoding="utf-8")

    assert len(chunk_ids) == len(set(chunk_ids))
    assert len(sample_ids) == len(set(sample_ids))
    assert "approved_answer" not in raw_response_text
    assert all(
        response["retrieved_count"] == len(response["contexts"])
        for response in RESPONSES
    )
    assert all(
        response["max_score"]
        == max((context["score"] for context in response["contexts"]), default=0.0)
        for response in RESPONSES
    )


@pytest.mark.parametrize("sample", SAMPLES, ids=lambda sample: sample["id"])
def test_fake_question_retrieves_person1_schema_and_uses_generation(sample):
    retriever = MockRetriever()
    service, llm = _service(retriever)
    retrieved = retriever.retrieve(sample["question"])
    result = service.chat(message=sample["question"])

    assert result["search_query"] == sample["question"]
    assert result["grounded"] is sample["expected_grounded"]

    if not sample["expected_grounded"]:
        assert retrieved == []
        assert result["answer"] == UNSUPPORTED_ANSWER
        assert result["sources"] == []
        assert llm.calls == []
        return

    assert retrieved
    assert retrieved[0]["chunk_id"] == sample["expected_chunk_id"]
    assert retrieved[0]["metadata"]["doc_name"] == sample["expected_document"]
    assert result["sources"][0]["document"] == sample["expected_document"]
    assert result["sources"][0]["section"] == sample["expected_section"]
    assert result["answer"] == GENERATED_TEST_ANSWER
    assert result["tts_text"] == normalize_for_tts(result["answer"])
    assert len(llm.calls) == 1
    assert llm.calls[0]["kwargs"]["do_sample"] is False
    assert llm.calls[0]["kwargs"]["temperature"] == 0.0
