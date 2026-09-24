import enum
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import Column, Enum as SAEnum, JSON
from sqlmodel import Field, SQLModel


class ModelProvider(str, enum.Enum):
    openai = "openai"
    anthropic = "anthropic"
    google = "google"
    ollama = "ollama"
    local = "local"
    custom = "custom"


class ModelType(str, enum.Enum):
    chat = "chat"
    embedding = "embedding"
    stt = "stt"
    tts = "tts"
    vision = "vision"
    multimodal = "multimodal"


class RegisteredModel(SQLModel, table=True):
    __tablename__ = "registered_model"
    """A model registered in the workspace for use by agents and tools."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(index=True)
    provider: ModelProvider = Field(sa_column=Column(SAEnum(ModelProvider), nullable=False))
    model_type: ModelType = Field(sa_column=Column(SAEnum(ModelType), nullable=False))
    capabilities: list[str] = Field(default_factory=list, sa_column=Column(JSON, default=[]))
    config: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON, default={}))
    is_local: bool = Field(default=False)
    is_default: bool = Field(default=False)
    requires_consent: bool = Field(default=False)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
