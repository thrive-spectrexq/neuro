from datetime import datetime
from typing import Optional
import uuid
from pydantic import BaseModel, ConfigDict

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class ProjectResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime
    user_id: uuid.UUID
    
    model_config = ConfigDict(from_attributes=True)
