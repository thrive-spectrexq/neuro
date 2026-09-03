import uuid
from datetime import UTC, datetime
from enum import Enum
from typing import Any

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel


class MemoryType(str, Enum):
    SHORT_TERM = "short_term"  # Ephemeral conversation context/window
    SESSION = "session"  # Active task/session facts
    LONG_TERM = "long_term"  # Persistent user knowledge, preferences & facts


class Memory(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    memory_type: MemoryType = Field(default=MemoryType.SESSION, index=True)
    key: str = Field(index=True)
    content: str
    metadata_: dict[str, Any] = Field(default_factory=dict, sa_column=Column("metadata", JSON))
    confidence: float = Field(default=1.0)
    ttl_seconds: int | None = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    expires_at: datetime | None = Field(default=None, index=True)
    is_deleted: bool = Field(default=False, index=True)
