from typing import Optional, Dict, Any, List
import uuid
from datetime import datetime, timezone
from sqlmodel import SQLModel, Field, Column, JSON

class AutomationRule(SQLModel, table=True):
    __tablename__ = "automation_rule"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str
    description: Optional[str] = None
    trigger_type: str  # e.g. on_note_created, on_tag_added
    conditions: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    actions: List[Dict[str, Any]] = Field(default_factory=list, sa_column=Column(JSON))
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
