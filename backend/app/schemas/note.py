from datetime import datetime
from typing import Optional
import uuid
from pydantic import BaseModel, ConfigDict
from app.models.note import ContentType

class NoteCreate(BaseModel):
    title: str
    content: str
    content_type: ContentType = ContentType.markdown
    is_archived: bool = False
    is_pinned: bool = False
    parent_id: Optional[uuid.UUID] = None

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    content_type: Optional[ContentType] = None
    is_archived: Optional[bool] = None
    is_pinned: Optional[bool] = None
    parent_id: Optional[uuid.UUID] = None

class NoteResponse(BaseModel):
    id: uuid.UUID
    title: str
    content: str
    content_type: ContentType
    created_at: datetime
    updated_at: datetime
    is_archived: bool
    is_pinned: bool
    parent_id: Optional[uuid.UUID]
    user_id: uuid.UUID
    
    model_config = ConfigDict(from_attributes=True)

class NoteListResponse(BaseModel):
    items: list[NoteResponse]
    total: int
    page: int
    size: int
