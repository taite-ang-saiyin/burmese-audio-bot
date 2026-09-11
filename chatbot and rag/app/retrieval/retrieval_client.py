from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from http.client import RemoteDisconnected
import json
from pathlib import Path
import re
from typing import Protocol
import unicodedata
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class Retriever(Protocol):
    def retrieve(self, query: str) -> list[dict] | "RetrievalResult":
        ...


@dataclass(frozen=True)
class RetrievalResult:
    """Normalized Person 1 result, including the no-context fallback answer."""

    chunks: list[dict]
    fallback_answer: str | None = None
    has_context: bool = False
    language: str | None = None
    confidence: str | None = None


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MOCK_RESPONSES_PATH = (
    PROJECT_ROOT / "data" / "mock_person1_rag_responses.json"
)
DEFAULT_MOCK_QUESTIONS_PATH = PROJECT_ROOT / "data" / "mock_banking_questions.json"


def adapt_person1_response(payload: dict) -> list[dict]:
    """Convert either published Person 1 schema into the internal chunk format."""

    if not isinstance(payload, dict):
        raise RuntimeError("Person 1 RAG response must be a JSON object.")

    has_context = payload.get("has_context")
    contexts = payload.get("contexts", [])
    if has_context is False:
        if contexts not in (None, []):
            raise RuntimeError(
                "Person 1 returned has_context=false with non-empty contexts."
            )
        return []
    if not isinstance(contexts, list):
        raise RuntimeError("Person 1 response requires a contexts list.")
    if has_context not in (None, True):
        raise RuntimeError("Person 1 response has an invalid has_context value.")
    if not contexts:
        return []

    retrieved_count = payload.get("retrieved_count")
    if retrieved_count is not None and int(retrieved_count) != len(contexts):
        raise RuntimeError(
            "Person 1 retrieved_count does not match the number of contexts."
        )

    adapted_chunks: list[dict] = []
    for index, context in enumerate(contexts, start=1):
        if not isinstance(context, dict):
            raise RuntimeError(f"Person 1 context {index} must be a JSON object.")

        # The current HTTP API calls this object `source`; older fixtures used
        # `metadata`. Supporting both keeps local regression data useful.
        metadata = context.get("source", context.get("metadata"))
        if not isinstance(metadata, dict):
            raise RuntimeError(
                f"Person 1 context {index} has no source/metadata object."
            )

        chunk_id = str(context.get("chunk_id", "")).strip()
        text = str(context.get("text", "")).strip()
        if not chunk_id or not text:
            raise RuntimeError(
                f"Person 1 context {index} requires chunk_id and text."
            )

        try:
            raw_score = context.get("retrieval_score", context.get("score"))
            score = float(raw_score)
        except (KeyError, TypeError, ValueError) as exc:
            raise RuntimeError(
                f"Person 1 context {index} requires a numeric retrieval score."
            ) from exc

        document = metadata.get("doc_name")
        page = metadata.get("page_number", metadata.get("page_label"))
        section = metadata.get("section", metadata.get("section_title"))

        adapted_chunks.append(
            {
                "id": chunk_id,
                "chunk_id": chunk_id,
                "text": text,
                "score": score,
                "document": document,
                "page": page,
                "section": section,
                "question": str(context.get("question", "")).strip() or None,
                "metadata": dict(metadata),
            }
        )

    return adapted_chunks


def parse_person1_response(payload: dict) -> RetrievalResult:
    """Preserve Person 1's fallback answer as well as adapted contexts."""

    chunks = adapt_person1_response(payload)
    fallback = str(payload.get("answer", "")).strip() or None
    return RetrievalResult(
        chunks=chunks,
        fallback_answer=fallback if not chunks else None,
        has_context=bool(chunks),
        language=str(payload.get("language", "")).strip() or None,
        confidence=str(payload.get("confidence", "")).strip() or None,
    )


def _load_json(path: Path) -> dict:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise RuntimeError(f"Mock RAG data file not found: {path}") from exc
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Mock RAG data is invalid JSON: {path}") from exc
    if not isinstance(payload, dict):
        raise RuntimeError(f"Mock RAG data must be a JSON object: {path}")
    return payload


class MockRetriever:
    """Replay synthetic responses using Person 1's real response contract."""

    def __init__(
        self,
        responses_path: str | Path | None = None,
        questions_path: str | Path | None = None,
    ) -> None:
        response_payload = _load_json(
            Path(responses_path) if responses_path else DEFAULT_MOCK_RESPONSES_PATH
        )
        question_payload = _load_json(
            Path(questions_path) if questions_path else DEFAULT_MOCK_QUESTIONS_PATH
        )

        responses = response_payload.get("responses")
        samples = question_payload.get("samples")
        if not isinstance(responses, list) or not responses:
            raise RuntimeError("Mock Person 1 data contains no responses.")
        if not isinstance(samples, list) or not samples:
            raise RuntimeError("Mock banking question data contains no samples.")

        self.responses = responses
        self.samples = samples
        self._responses_by_query = {
            self._normalize(str(response.get("query", ""))): response
            for response in responses
            if response.get("query")
        }
        self._responses_by_chunk_id: dict[str, dict] = {}
        self.chunks: list[dict] = []
        for response in responses:
            chunks = adapt_person1_response(response)
            self.chunks.extend(chunks)
            for chunk in chunks:
                self._responses_by_chunk_id[chunk["chunk_id"]] = response

        self._samples_by_query = {
            self._normalize(str(sample["question"])): sample for sample in samples
        }

    @staticmethod
    def _normalize(text: str) -> str:
        normalized = unicodedata.normalize("NFC", text).casefold()
        # Burmese writers commonly vary whether a space appears between a
        # banking term and the following word ("ကတ် ပျောက်" vs "ကတ်ပျောက်").
        # Mock fixtures replay known queries, so ignore whitespace entirely
        # while keeping punctuation and wording significant.
        return re.sub(r"\s+", "", normalized)

    def retrieve(self, query: str) -> list[dict]:
        normalized_query = self._normalize(query)

        response = self._responses_by_query.get(normalized_query)
        if response is not None:
            return adapt_person1_response(response)

        sample = self._samples_by_query.get(normalized_query)
        if sample is None or not sample.get("expected_grounded"):
            return []

        expected_chunk_id = sample.get("expected_chunk_id")
        response = self._responses_by_chunk_id.get(str(expected_chunk_id))
        return adapt_person1_response(response) if response else []


class Person1Retriever:
    """Adapt Person 1's Python client/function to the Person 2 Retriever API."""

    def __init__(self, retrieve_response: Callable[[str], dict]) -> None:
        self.retrieve_response = retrieve_response

    def retrieve(self, query: str) -> RetrievalResult:
        return parse_person1_response(self.retrieve_response(query))


class Person1HTTPRetriever:
    """Call Person 1's POST /api/v1/retrieve endpoint over HTTP."""

    def __init__(
        self,
        *,
        endpoint_url: str,
        service_token: str = "",
        top_k: int = 3,
        timeout_seconds: int = 30,
    ) -> None:
        self.endpoint_url = endpoint_url.strip()
        self.service_token = service_token.strip()
        self.top_k = top_k
        self.timeout_seconds = timeout_seconds
        if not self.endpoint_url:
            raise ValueError("PERSON1_RAG_URL must not be empty.")
        if not 1 <= self.top_k <= 10:
            raise ValueError("PERSON1_RAG_TOP_K must be between 1 and 10.")

    def retrieve(self, query: str) -> RetrievalResult:
        body = json.dumps(
            {"query": query, "top_k": self.top_k}, ensure_ascii=False
        ).encode("utf-8")
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json; charset=utf-8",
        }
        if self.service_token:
            headers["X-RAG-Service-Token"] = self.service_token

        request = Request(
            self.endpoint_url,
            data=body,
            headers=headers,
            method="POST",
        )
        try:
            with urlopen(request, timeout=self.timeout_seconds) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            raise RuntimeError(
                f"Person 1 RAG API returned HTTP {exc.code}."
            ) from exc
        except TimeoutError as exc:
            raise RuntimeError(
                "Person 1 RAG API timed out. Check that the other laptop is "
                "awake and the RAG service is responsive."
            ) from exc
        except RemoteDisconnected as exc:
            raise RuntimeError(
                "Person 1 RAG API closed the connection without a response. "
                "Check that its retrieval worker is healthy and responsive."
            ) from exc
        except URLError as exc:
            if isinstance(exc.reason, TimeoutError):
                raise RuntimeError(
                    "Person 1 RAG API timed out. Check that the other laptop is "
                    "awake and the RAG service is responsive."
                ) from exc
            raise RuntimeError(
                "Cannot connect to Person 1 RAG API. Check the LAN address, "
                "server process, and firewall."
            ) from exc
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise RuntimeError("Person 1 RAG API returned invalid JSON.") from exc

        return parse_person1_response(payload)
