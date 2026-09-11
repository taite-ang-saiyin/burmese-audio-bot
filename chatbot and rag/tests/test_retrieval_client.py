import json
from http.client import RemoteDisconnected

import pytest

import app.retrieval.retrieval_client as retrieval_client
from app.retrieval.retrieval_client import (
    MockRetriever,
    Person1HTTPRetriever,
    Person1Retriever,
    adapt_person1_response,
    parse_person1_response,
)


PERSON1_RESPONSE = {
    "query": "ATM ကတ် ပျောက်သွားရင် ဘာလုပ်ရမလဲ။",
    "has_context": True,
    "retrieved_count": 1,
    "max_score": 0.885,
    "contexts": [
        {
            "chunk_id": "chunk_9f823a",
            "text": "ATM ကတ်ပျောက်ပါက ဘဏ်ကို ချက်ချင်းဆက်သွယ်ပါ။",
            "score": 0.885,
            "metadata": {
                "doc_id": "doc_102",
                "doc_name": "ATM_Services_FAQ_v1.pdf",
                "page_label": "3",
                "section_title": "Card Loss Procedure",
                "department": "Retail Banking",
                "last_updated": "2026-01-15",
            },
        }
    ],
}


CURRENT_PERSON1_RESPONSE = {
    "query": "replacement documents",
    "language": "my",
    "has_context": True,
    "confidence": "high",
    "contexts": [
        {
            "rank": 1,
            "chunk_id": "card_replacement_policy_md_sec_2",
            "question": "replacement documents",
            "text": "Bring the original NRC to the bank branch.",
            "source": {
                "doc_name": "card_replacement_policy.md",
                "section": "Required Verification Documents",
                "page_number": 1,
            },
            "retrieval_score": 0.18987220353917703,
        }
    ],
    "instructions": {
        "answer_only_from_context": True,
        "answer_language": "my",
        "include_citations": True,
        "return_json_only": True,
        "do_not_invent_information": True,
    },
}


def test_person1_response_is_adapted_without_losing_metadata():
    chunks = adapt_person1_response(PERSON1_RESPONSE)

    assert chunks == [
        {
            "id": "chunk_9f823a",
            "chunk_id": "chunk_9f823a",
            "text": "ATM ကတ်ပျောက်ပါက ဘဏ်ကို ချက်ချင်းဆက်သွယ်ပါ။",
            "score": 0.885,
            "document": "ATM_Services_FAQ_v1.pdf",
            "page": "3",
            "section": "Card Loss Procedure",
            "question": None,
            "metadata": PERSON1_RESPONSE["contexts"][0]["metadata"],
        }
    ]
    assert "approved_answer" not in chunks[0]


def test_no_context_response_becomes_an_empty_chunk_list():
    assert adapt_person1_response(
        {
            "query": "မသိသောမေးခွန်း",
            "has_context": False,
            "retrieved_count": 0,
            "max_score": 0.0,
            "contexts": [],
        }
    ) == []


def test_current_person1_schema_maps_source_and_retrieval_score():
    chunks = adapt_person1_response(CURRENT_PERSON1_RESPONSE)

    assert chunks[0]["chunk_id"] == "card_replacement_policy_md_sec_2"
    assert chunks[0]["document"] == "card_replacement_policy.md"
    assert chunks[0]["section"] == "Required Verification Documents"
    assert chunks[0]["page"] == 1
    assert chunks[0]["score"] == pytest.approx(0.18987220353917703)
    assert chunks[0]["question"] == "replacement documents"


def test_schema_sample_without_optional_has_context_is_accepted():
    payload = dict(CURRENT_PERSON1_RESPONSE)
    payload.pop("has_context")

    assert adapt_person1_response(payload)[0]["chunk_id"] == (
        "card_replacement_policy_md_sec_2"
    )


def test_no_context_answer_is_preserved_for_person2():
    result = parse_person1_response(
        {
            "query": "unknown",
            "language": "my",
            "has_context": False,
            "confidence": "low",
            "contexts": [],
            "answer": "Please contact official Customer Service.",
        }
    )

    assert result.chunks == []
    assert result.fallback_answer == "Please contact official Customer Service."
    assert result.has_context is False


def test_retrieved_count_mismatch_is_rejected():
    invalid = dict(PERSON1_RESPONSE, retrieved_count=2)

    with pytest.raises(RuntimeError, match="retrieved_count"):
        adapt_person1_response(invalid)


def test_person1_retriever_calls_the_injected_person1_client():
    queries = []

    def fake_person1_client(query: str) -> dict:
        queries.append(query)
        return PERSON1_RESPONSE

    result = Person1Retriever(fake_person1_client).retrieve("ATM ကတ်ပျောက်တယ်။")

    assert queries == ["ATM ကတ်ပျောက်တယ်။"]
    assert result.chunks[0]["chunk_id"] == "chunk_9f823a"


def test_http_retriever_posts_documented_contract_and_token(monkeypatch):
    captured = {}

    class FakeHTTPResponse:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            return None

        def read(self):
            return json.dumps(CURRENT_PERSON1_RESPONSE).encode("utf-8")

    def fake_urlopen(request, timeout):
        captured["request"] = request
        captured["timeout"] = timeout
        return FakeHTTPResponse()

    monkeypatch.setattr(retrieval_client, "urlopen", fake_urlopen)
    retriever = Person1HTTPRetriever(
        endpoint_url="http://person1.test/api/v1/retrieve",
        service_token="secret-token",
        top_k=2,
        timeout_seconds=9,
    )

    result = retriever.retrieve("replacement documents")

    request = captured["request"]
    assert request.method == "POST"
    assert request.get_header("X-rag-service-token") == "secret-token"
    assert json.loads(request.data.decode("utf-8")) == {
        "query": "replacement documents",
        "top_k": 2,
    }
    assert captured["timeout"] == 9
    assert result.chunks[0]["score"] == pytest.approx(0.18987220353917703)


def test_http_retriever_reports_dropped_connection(monkeypatch):
    def fake_urlopen(*_args, **_kwargs):
        raise RemoteDisconnected("remote end closed connection")

    monkeypatch.setattr(retrieval_client, "urlopen", fake_urlopen)
    retriever = Person1HTTPRetriever(
        endpoint_url="http://person1.test/api/v1/retrieve",
    )

    with pytest.raises(RuntimeError, match="closed the connection"):
        retriever.retrieve("replacement documents")


def test_mock_retrieval_ignores_optional_burmese_spacing():
    with_spaces = MockRetriever().retrieve(
        "ATM ကတ် ပျောက်သွားရင် ဘာလုပ်ရမလဲ။"
    )
    without_spaces = MockRetriever().retrieve(
        "ATM ကတ်ပျောက်သွားရင် ဘာလုပ်ရမလဲ။"
    )

    assert without_spaces == with_spaces
    assert without_spaces[0]["chunk_id"] == "chunk_9f823a"
