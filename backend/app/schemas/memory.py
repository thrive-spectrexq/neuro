import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.models.memory import MemoryType


class MemoryCreate(BaseModel):
    key: str
    content: str
    memory_type: MemoryType = MemoryType.SESSION
    metadata_: dict[str, Any] | None = None
    confidence: float = 1.0
    ttl_seconds: int | None = None


class MemoryUpdate(BaseModel):
    content: str | None = None
    confidence: float | None = None
    metadata_: dict[str, Any] | None = None
    ttl_seconds: int | None = None


class MemoryResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    memory_type: MemoryType
    key: str
    content: str
    metadata_: dict[str, Any]
    confidence: float
    ttl_seconds: int | None
    created_at: datetime
    updated_at: datetime
    expires_at: datetime | None

    model_config = ConfigDict(from_attributes=True)
