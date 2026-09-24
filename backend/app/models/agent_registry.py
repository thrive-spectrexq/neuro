import enum
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import Column, JSON
from sqlmodel import Field, SQLModel


class AgentDefinition(SQLModel, table=True):
    __tablename__ = "agent_definition"
    """A personal agent definition in the workspace."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(index=True)
    description: str = Field(default="")
    system_prompt: str = Field(default="You are a helpful assistant.")
    model_id: uuid.UUID | None = Field(default=None)
    tools: list[str] = Field(default_factory=list, sa_column=Column(JSON, default=[]))
    permissions: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON, default={}))
    is_active: bool = Field(default=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class AgentExecution(SQLModel, table=True):
    __tablename__ = "agent_execution"
    """Record of an agent execution for audit and debugging."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    agent_id: uuid.UUID = Field(foreign_key="agent_definition.id", index=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    input_text: str = Field(default="")
    tools_called: list[dict[str, Any]] = Field(default_factory=list, sa_column=Column(JSON, default=[]))
    model_used: str = Field(default="")
    output_text: str = Field(default="")
    tokens_used: int = Field(default=0)
    latency_ms: float = Field(default=0.0)
    success: bool = Field(default=True)
    governance_decision: str = Field(default="allowed")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
