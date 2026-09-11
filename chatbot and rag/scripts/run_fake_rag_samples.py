from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
from time import perf_counter


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from app.conversation.query_rewriter import QueryRewriter  # noqa: E402
from app.conversation.session_manager import SessionManager  # noqa: E402
from app.llm.ollama_service import OllamaService  # noqa: E402
from app.retrieval.retrieval_client import MockRetriever  # noqa: E402
from app.services.chat_service import ChatService  # noqa: E402


QUESTIONS_PATH = PROJECT_ROOT / "data" / "mock_banking_questions.json"


class RecordingLLM:
    """Record raw model output and CPU latency for manual evaluation."""

    def __init__(self, delegate: OllamaService) -> None:
        self.delegate = delegate
        self.calls: list[dict] = []

    def generate(self, messages, **kwargs):
        started_at = perf_counter()
        try:
            output = self.delegate.generate(messages, **kwargs)
        except Exception as exc:
            self.calls.append(
                {
                    "duration_seconds": round(perf_counter() - started_at, 3),
                    "output": None,
                    "error": f"{type(exc).__name__}: {exc}",
                }
            )
            raise

        self.calls.append(
            {
                "duration_seconds": round(perf_counter() - started_at, 3),
                "output": output,
                "error": None,
            }
        )
        return output


def build_service(retriever) -> tuple[ChatService, RecordingLLM]:
    recorder = RecordingLLM(OllamaService())
    llm = recorder
    service = ChatService(
        llm=llm,
        retriever=retriever,
        session_manager=SessionManager(),
        query_rewriter=QueryRewriter(llm),
    )
    return service, recorder


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run synthetic banking questions through the fake RAG pipeline."
    )
    parser.add_argument("--intent", help="Only run one intent, for example atm_lost_card")
    parser.add_argument(
        "--style",
        choices=("formal_burmese", "casual_burmese", "mixed_language"),
        help="Only run one sentence style.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        required=True,
        help="Maximum number of model-generated samples to run.",
    )
    parser.add_argument(
        "--show-answer", action="store_true", help="Print each complete Burmese answer."
    )
    parser.add_argument(
        "--report-json",
        type=Path,
        help=(
            "Save per-sample results, raw model attempts, and latency to a JSON "
            "file. Relative paths are resolved from the project directory."
        ),
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    payload = json.loads(QUESTIONS_PATH.read_text(encoding="utf-8"))
    samples = payload["samples"]
    if args.intent:
        samples = [sample for sample in samples if sample["intent"] == args.intent]
    if args.style:
        samples = [sample for sample in samples if sample["style"] == args.style]
    if args.limit is not None:
        samples = samples[: args.limit]

    retriever = MockRetriever()
    service, recorder = build_service(retriever)
    failures = 0
    report_samples = []

    for sample in samples:
        first_model_call = len(recorder.calls)
        retrieved = retriever.retrieve(sample["question"])
        result = service.chat(message=sample["question"])
        model_attempts = recorder.calls[first_model_call:]
        actual_chunk_id = retrieved[0]["chunk_id"] if retrieved else None
        expected_chunk_id = sample.get("expected_chunk_id")
        passed = (
            result["grounded"] is sample["expected_grounded"]
            and actual_chunk_id == expected_chunk_id
            and all(
                text in result["answer"]
                for text in sample.get("answer_must_contain", [])
            )
        )
        failures += int(not passed)
        status = "PASS" if passed else "FAIL"
        print(
            f"[{status}] {sample['id']} | {sample['style']} | "
            f"chunk={actual_chunk_id or '-'} | grounded={result['grounded']}"
        )
        print(f"       Q: {sample['question']}")
        if args.show_answer or not passed:
            print(f"       A: {result['answer']}")
        for attempt_number, attempt in enumerate(model_attempts, start=1):
            print(
                f"       Model attempt {attempt_number}: "
                f"{attempt['duration_seconds']:.3f}s"
            )
            if attempt["error"]:
                print(f"       Error: {attempt['error']}")
            else:
                print(f"       Raw: {attempt['output']}")

        report_samples.append(
            {
                "id": sample["id"],
                "intent": sample["intent"],
                "style": sample["style"],
                "question": sample["question"],
                "expected_chunk_id": expected_chunk_id,
                "actual_chunk_id": actual_chunk_id,
                "expected_grounded": sample["expected_grounded"],
                "grounded": result["grounded"],
                "passed": passed,
                "answer": result["answer"],
                "tts_text": result["tts_text"],
                "sources": result["sources"],
                "model_attempts": model_attempts,
            }
        )

    print(f"\nSummary: {len(samples) - failures}/{len(samples)} passed")
    if args.report_json:
        report_path = args.report_json
        if not report_path.is_absolute():
            report_path = PROJECT_ROOT / report_path
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report = {
            "created_at": datetime.now(timezone.utc).isoformat(),
            "model": recorder.delegate.model_name,
            "model_generation": True,
            "total": len(samples),
            "passed": len(samples) - failures,
            "failed": failures,
            "samples": report_samples,
        }
        report_path.write_text(
            json.dumps(report, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(f"Report: {report_path}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
