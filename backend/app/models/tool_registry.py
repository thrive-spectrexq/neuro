import enum
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import Column, Enum as SAEnum, JSON
from sqlmodel import Field, SQLModel


class ToolCategory(str, enum.Enum):
    os = "os"
    knowledge = "knowledge"
    web = "web"
    media = "media"
    vision = "vision"
    custom = "custom"


class ToolDefinition(SQLModel, table=True):
    __tablename__ = "tool_definition"
    """A composable tool that agents can invoke."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(index=True, unique=True)
    description: str = Field(default="")
    category: ToolCategory = Field(sa_column=Column(SAEnum(ToolCategory), nullable=False, default="custom"))
    parameters_schema: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON, default={}))
    handler_type: str = Field(default="builtin")
    handler_config: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON, default={}))
    requires_consent: bool = Field(default=False)
    is_active: bool = Field(default=True)
    user_id: uuid.UUID | None = Field(default=None, foreign_key="user.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
