import uuid
from datetime import UTC, datetime
from enum import Enum

from sqlmodel import Field, SQLModel


class NoteLink(SQLModel, table=True):
    source_id: uuid.UUID = Field(foreign_key="note.id", primary_key=True)
    target_id: uuid.UUID = Field(foreign_key="note.id", primary_key=True)

class ContentType(str, Enum):
    markdown = "markdown"
    richtext = "richtext"

class Note(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    title: str
    content: str
    content_type: ContentType = Field(default=ContentType.markdown)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    is_archived: bool = Field(default=False)
    is_pinned: bool = Field(default=False)
    parent_id: uuid.UUID | None = Field(default=None, foreign_key="note.id")
    project_id: uuid.UUID | None = Field(default=None, foreign_key="project.id")
    user_id: uuid.UUID = Field(foreign_key="user.id")
    
    # relationships won't be exported in schema by default unless we use them
    # NoteTag is defined in tag.py but we can't easily import it here due to circular deps,
    # so we'll just handle it manually in the routes for now.
