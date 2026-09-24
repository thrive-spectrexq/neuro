from typing import Any

from pydantic import BaseModel


class VisionAnalyzeRequest(BaseModel):
    prompt: str = "Describe this image."


class VisionAnalyzeResponse(BaseModel):
    success: bool
    text: str
    analysis: dict[str, Any] = {}
    error: str | None = None


class VisionOCRResponse(BaseModel):
    success: bool
    text: str
    char_count: int
    error: str | None = None


class VisionScreenResponse(BaseModel):
    success: bool
    text: str
    analysis: dict[str, Any] = {}
    error: str | None = None
