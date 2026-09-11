from __future__ import annotations

import re
from typing import Any

import torch
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
)

from app.config import settings


class QwenService:

    def __init__(self) -> None:
        self.model_name = settings.transformers_model_name
        self.tokenizer: Any | None = None
        self.model: Any | None = None

    @property
    def is_loaded(self) -> bool:
        return (
            self.model is not None
            and self.tokenizer is not None
        )

    def load(self) -> None:
        if self.is_loaded:
            return

        use_cuda = torch.cuda.is_available()
        use_4bit = settings.use_4bit and use_cuda

        print(f"Loading Qwen on {'GPU' if use_cuda else 'CPU'}...")
        print("Model:", self.model_name)

        if settings.use_4bit and not use_cuda:
            print("4-bit loading requires CUDA; using the model's native dtype on CPU.")

        self.tokenizer = AutoTokenizer.from_pretrained(
            self.model_name
        )

        model_kwargs: dict[str, Any] = {
            "device_map": "auto" if use_cuda else {"": "cpu"},
            "torch_dtype": "auto",
        }
        if use_4bit:
            model_kwargs["quantization_config"] = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_compute_dtype=torch.bfloat16,
                bnb_4bit_use_double_quant=True,
            )

        self.model = AutoModelForCausalLM.from_pretrained(
            self.model_name,
            **model_kwargs,
        )

        self.model.eval()

        print("Qwen loaded successfully on CPU.")

    def generate(
        self,
        messages: list[dict[str, str]],
        *,
        max_new_tokens: int | None = None,
        do_sample: bool = False,
        temperature: float = 0.0,
    ) -> str:

        self.load()

        assert self.tokenizer is not None
        assert self.model is not None

        prompt = self.tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
            enable_thinking=False,
        )

        inputs = self.tokenizer(
            prompt,
            return_tensors="pt",
        ).to(self.model.device)

        generation_kwargs = {
            "max_new_tokens": max_new_tokens or settings.max_new_tokens,
            "do_sample": do_sample,
            "repetition_penalty": 1.08,
            "pad_token_id": self.tokenizer.eos_token_id,
        }

        if do_sample:
            generation_kwargs.update(
                {
                    "temperature": max(temperature, 0.01),
                    "top_p": 0.9,
                    "top_k": 40,
                }
            )

        with torch.no_grad():

            outputs = self.model.generate(
                **inputs,
                **generation_kwargs,
            )

        generated_tokens = outputs[0][
            inputs["input_ids"].shape[1]:
        ]

        answer = self.tokenizer.decode(
            generated_tokens,
            skip_special_tokens=True,
        )

        # Qwen should not emit thinking text when enable_thinking=False, but
        # remove it defensively so it can never reach the customer or TTS.
        answer = re.sub(r"<think>.*?</think>", "", answer, flags=re.DOTALL)
        answer = answer.replace("<think>", "").replace("</think>", "")
        return answer.strip()
