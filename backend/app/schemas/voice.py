from pydantic import BaseModel, Field


class VoiceSessionStatus(BaseModel):
    session_id: str = Field(..., min_length=1, description="Unique identifier for the voice session")
    connected: bool = Field(..., description="Whether the voice session is currently connected")
    duration_seconds: float | None = Field(default=None, ge=0.0, description="Duration of the session in seconds")
