from __future__ import annotations

from google import genai
from google.genai import types

from app.config import settings


class GeminiService:
    """Vertex AI Gemini adapter using Application Default Credentials."""

    def __init__(self) -> None:
        if not settings.google_cloud_project:
            raise ValueError("GOOGLE_CLOUD_PROJECT is required when LLM_BACKEND=gemini")
        self.model_name = settings.gemini_model_name
        self._client = genai.Client(
            vertexai=True,
            project=settings.google_cloud_project,
            location=settings.google_cloud_location,
        )

    @property
    def is_loaded(self) -> bool:
        return True

    def generate(self, messages: list[dict[str, str]], *, max_new_tokens: int | None = None, do_sample: bool = False, temperature: float = 0.0) -> str:
        system_content = None
        contents = []
        for msg in messages:
            role = msg.get("role")
            content = msg.get("content", "")
            if role == "system":
                system_content = content
            else:
                contents.append(f"{role.upper()}: {content}")

        prompt = "\n\n".join(contents)
        config = types.GenerateContentConfig(
            temperature=temperature,
            max_output_tokens=max_new_tokens or settings.max_new_tokens,
            system_instruction=system_content if system_content else None,
        )
        response = self._client.models.generate_content(
            model=self.model_name,
            contents=prompt,
            config=config,
        )
        answer = (response.text or "").strip()
        if not answer:
            raise RuntimeError("Gemini returned an empty answer.")
        return answer
