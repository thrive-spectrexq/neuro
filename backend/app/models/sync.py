from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class SyncBlobBase(SQLModel):
    user_id: UUID = Field(foreign_key="user.id", index=True)
    encrypted_data: str
    version: int = Field(default=1)


class SyncBlob(SyncBlobBase, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SyncBlobCreate(SyncBlobBase):
    pass


class SyncBlobRead(SyncBlobBase):
    id: UUID
    created_at: datetime
