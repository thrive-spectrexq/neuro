import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ModelCreate(BaseModel):
    name: str
    provider: str
    model_type: str
    capabilities: list[str] = Field(default_factory=list)
    config: dict[str, Any] = Field(default_factory=dict)
    is_local: bool = False
    is_default: bool = False
    requires_consent: bool = False


class ModelUpdate(BaseModel):
    name: str | None = None
    config: dict[str, Any] | None = None
    capabilities: list[str] | None = None
    is_default: bool | None = None
    is_local: bool | None = None
    requires_consent: bool | None = None


class ModelResponse(BaseModel):
    id: uuid.UUID
    name: str
    provider: str
    model_type: str
    capabilities: list[str]
    config: dict[str, Any]
    is_local: bool
    is_default: bool
    requires_consent: bool
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ModelInvokeRequest(BaseModel):
    input_text: str | None = None
    input_data: dict[str, Any] | None = None
    parameters: dict[str, Any] = Field(default_factory=dict)


class ModelInvokeResponse(BaseModel):
    model_id: uuid.UUID
    model_name: str
    provider: str
    output: Any
    tokens_used: int | None = None
    latency_ms: float | None = None


class ModelUsageStats(BaseModel):
    model_id: uuid.UUID
    model_name: str
    total_invocations: int
    total_tokens: int
    avg_latency_ms: float


class ModelDiscoverResponse(BaseModel):
    discovered: list[dict[str, Any]]
    provider: str
