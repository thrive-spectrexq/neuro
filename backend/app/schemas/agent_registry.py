import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class AgentCreate(BaseModel):
    name: str
    description: str = ""
    system_prompt: str = "You are a helpful assistant."
    model_id: uuid.UUID | None = None
    tools: list[str] = Field(default_factory=list)
    permissions: dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True


class AgentUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    system_prompt: str | None = None
    model_id: uuid.UUID | None = None
    tools: list[str] | None = None
    permissions: dict[str, Any] | None = None
    is_active: bool | None = None


class AgentResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str
    system_prompt: str
    model_id: uuid.UUID | None
    tools: list[str]
    permissions: dict[str, Any]
    is_active: bool
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class AgentExecuteRequest(BaseModel):
    command: str
    context: dict[str, Any] = Field(default_factory=dict)


class AgentExecuteResponse(BaseModel):
    success: bool
    agent_id: uuid.UUID
    agent_name: str
    input_text: str
    tool_name: str | None = None
    output_text: str
    voice_response: str = ""
    tokens_used: int = 0
    latency_ms: float = 0.0
    governance_decision: str = "allowed"


class AgentExecutionHistoryResponse(BaseModel):
    id: uuid.UUID
    agent_id: uuid.UUID
    input_text: str
    output_text: str
    tools_called: list[dict[str, Any]]
    model_used: str
    tokens_used: int
    latency_ms: float
    success: bool
    governance_decision: str
    created_at: datetime
    model_config = {"from_attributes": True}
