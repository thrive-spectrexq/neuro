from datetime import datetime, timezone
from enum import Enum
from typing import Optional
import uuid
from sqlmodel import Field, SQLModel

class ContentType(str, Enum):
    markdown = "markdown"
    richtext = "richtext"

class Note(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    title: str
    content: str
    content_type: ContentType = Field(default=ContentType.markdown)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_archived: bool = Field(default=False)
    is_pinned: bool = Field(default=False)
    parent_id: Optional[uuid.UUID] = Field(default=None, foreign_key="note.id")
    user_id: uuid.UUID = Field(foreign_key="user.id")
