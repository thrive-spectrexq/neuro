import uuid
from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict

class AuditLogResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    project_id: uuid.UUID | None
    action: str
    target_type: str
    target_id: str
    details: dict[str, Any]
    timestamp: datetime
    
    model_config = ConfigDict(from_attributes=True)
