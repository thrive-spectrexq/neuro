import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict


class AutomationRuleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    trigger_type: str
    conditions: Dict[str, Any] = {}
    actions: List[Dict[str, Any]] = []
    is_active: bool = True


class AutomationRuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    trigger_type: Optional[str] = None
    conditions: Optional[Dict[str, Any]] = None
    actions: Optional[List[Dict[str, Any]]] = None
    is_active: Optional[bool] = None


class AutomationRuleResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    trigger_type: str
    conditions: Dict[str, Any]
    actions: List[Dict[str, Any]]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AutomationTestRequest(BaseModel):
    trigger_type: str
    conditions: Dict[str, Any] = {}
    actions: List[Dict[str, Any]] = []
    sample_payload: Dict[str, Any] = {}


class AutomationTestResponse(BaseModel):
    matched: bool
    simulated_actions: List[Dict[str, Any]]
    message: str
