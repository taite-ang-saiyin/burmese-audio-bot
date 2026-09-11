import json
from unittest.mock import patch
from urllib.error import URLError

import pytest

from app.config import settings
from app.llm.ollama_service import OllamaGeneration, OllamaService


class FakeResponse:
    def __init__(self, payload):
        self.payload = json.dumps(payload, ensure_ascii=False).encode("utf-8")

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return False

    def read(self):
        return self.payload


def test_ollama_chat_request_is_local_non_streaming_and_deterministic():
    response = FakeResponse(
        {
            "message": {"role": "assistant", "content": "ဆက်သွယ်ပေးပါ။"},
            "done_reason": "stop",
        }
    )

    with patch("app.llm.ollama_service.urlopen", return_value=response) as mocked:
        service = OllamaService()
        answer = service.generate(
            [{"role": "user", "content": "ဘာလုပ်ရမလဲ။"}],
            max_new_tokens=64,
            do_sample=False,
            temperature=0.7,
        )

    request = mocked.call_args.args[0]
    payload = json.loads(request.data.decode("utf-8"))
    assert request.full_url == "http://127.0.0.1:11434/api/chat"
    assert payload["model"] == "qwen3:4b-instruct-2507-q4_K_M"
    assert payload["stream"] is False
    assert payload["think"] is False
    assert payload["options"]["temperature"] == 0.0
    assert payload["options"]["num_predict"] == 64
    assert payload["options"]["num_ctx"] == settings.ollama_context_length
    assert payload["options"]["num_gpu"] == settings.ollama_num_gpu
    assert answer == "ဆက်သွယ်ပေးပါ။"
    assert isinstance(answer, OllamaGeneration)
    assert answer.done_reason == "stop"
    assert service.is_loaded is True


def test_ollama_generation_preserves_length_stop_reason():
    response = FakeResponse(
        {
            "message": {
                "role": "assistant",
                "content": "လူကိုယ်တိုင် လာရောက်လျှောက",
            },
            "done_reason": "length",
        }
    )

    with patch("app.llm.ollama_service.urlopen", return_value=response):
        answer = OllamaService().generate(
            [{"role": "user", "content": "ဘာလုပ်ရမလဲ။"}]
        )

    assert answer == "လူကိုယ်တိုင် လာရောက်လျှောက"
    assert answer.done_reason == "length"


def test_ollama_connection_error_has_startup_instructions():
    with patch(
        "app.llm.ollama_service.urlopen",
        side_effect=URLError("connection refused"),
    ):
        with pytest.raises(RuntimeError, match="ollama serve"):
            OllamaService().generate([{"role": "user", "content": "hello"}])
