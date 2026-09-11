from __future__ import annotations

import json
import re
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.config import settings


class OllamaGeneration(str):
    """Generated text carrying Ollama's completion reason."""

    done_reason: str | None

    def __new__(
        cls, value: str, *, done_reason: str | None = None
    ) -> "OllamaGeneration":
        instance = super().__new__(cls, value)
        instance.done_reason = done_reason
        return instance


class OllamaService:
    """Small synchronous client for Ollama's local chat API."""

    def __init__(self) -> None:
        self.model_name = settings.ollama_model_name
        self.base_url = settings.ollama_base_url
        self.timeout_seconds = settings.ollama_timeout_seconds
        self.keep_alive = settings.ollama_keep_alive
        self._has_generated = False

    @property
    def is_loaded(self) -> bool:
        if self._has_generated:
            return True

        # Ollama owns the model lifecycle, so also check its running-model
        # endpoint. Health checks stay safe when Ollama is not running.
        try:
            request = Request(f"{self.base_url}/api/ps", method="GET")
            with urlopen(request, timeout=min(self.timeout_seconds, 2)) as response:
                response_data = json.loads(response.read().decode("utf-8"))
        except (
            HTTPError,
            URLError,
            TimeoutError,
            json.JSONDecodeError,
            UnicodeDecodeError,
        ):
            return False

        return any(
            (model.get("name") or model.get("model")) == self.model_name
            for model in response_data.get("models", [])
        )

    def generate(
        self,
        messages: list[dict[str, str]],
        *,
        max_new_tokens: int | None = None,
        do_sample: bool = False,
        temperature: float = 0.0,
    ) -> str:
        options: dict[str, int | float] = {
            "num_predict": max_new_tokens or settings.max_new_tokens,
            "num_ctx": settings.ollama_context_length,
            "temperature": temperature if do_sample else 0.0,
            "seed": 0,
            "repeat_penalty": 1.08,
        }
        if settings.ollama_num_gpu is not None:
            options["num_gpu"] = settings.ollama_num_gpu
        if do_sample:
            options.update({"top_p": 0.9, "top_k": 40})

        payload = {
            "model": self.model_name,
            "messages": messages,
            "stream": False,
            "think": False,
            "keep_alive": self.keep_alive,
            "options": options,
        }
        request = Request(
            f"{self.base_url}/api/chat",
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            headers={"Content-Type": "application/json; charset=utf-8"},
            method="POST",
        )

        try:
            with urlopen(request, timeout=self.timeout_seconds) as response:
                response_data = json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            if exc.code == 404:
                raise RuntimeError(
                    f"Ollama model '{self.model_name}' is unavailable. "
                    f"Run: ollama pull {self.model_name}"
                ) from exc
            raise RuntimeError(
                f"Ollama returned HTTP {exc.code}: {detail or exc.reason}"
            ) from exc
        except TimeoutError as exc:
            raise RuntimeError(
                "Ollama generation timed out after "
                f"{self.timeout_seconds} seconds. The model is called only "
                "once; try a shorter RAG context or a smaller model."
            ) from exc
        except URLError as exc:
            if isinstance(exc.reason, TimeoutError):
                raise RuntimeError(
                    "Ollama generation timed out after "
                    f"{self.timeout_seconds} seconds. The model is called only "
                    "once; try a shorter RAG context or a smaller model."
                ) from exc
            raise RuntimeError(
                "Cannot connect to Ollama at "
                f"{self.base_url}. Start Ollama and run: ollama serve"
            ) from exc
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            raise RuntimeError("Ollama returned an invalid JSON response.") from exc

        answer = str(response_data.get("message", {}).get("content", "")).strip()
        if not answer:
            raise RuntimeError("Ollama returned an empty answer.")

        answer = re.sub(r"<think>.*?</think>", "", answer, flags=re.DOTALL)
        answer = answer.replace("<think>", "").replace("</think>", "").strip()
        self._has_generated = True
        raw_done_reason = response_data.get("done_reason")
        done_reason = (
            str(raw_done_reason).strip().casefold()
            if raw_done_reason is not None
            else None
        )
        return OllamaGeneration(answer, done_reason=done_reason)
