from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ChatRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {"message": "ATM ကတ်ပျောက်သွားရင် ဘာလုပ်ရမလဲ။"},
                {
                    "message": "အသစ်ပြန်လုပ်ဖို့ရော ဘာလိုလဲ။",
                    "session_id": "123e4567-e89b-42d3-a456-426614174000",
                },
            ]
        }
    )

    message: str = Field(min_length=1, max_length=2000)
    session_id: UUID | None = None

    @field_validator("message")
    @classmethod
    def message_must_not_be_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("message must not be blank")
        return cleaned


class SourceItem(BaseModel):
    document: str | None = None
    page: int | str | None = None
    section: str | None = None
    score: float | None = None


class ChatResponse(BaseModel):
    session_id: str
    original_question: str
    search_query: str
    answer: str
    tts_text: str
    sources: list[SourceItem]
    grounded: bool
