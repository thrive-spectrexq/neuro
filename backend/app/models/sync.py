from datetime import datetime, UTC
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class DeviceKeyBase(SQLModel):
    device_name: str
    public_key: str
    key_fingerprint: str


class DeviceKey(DeviceKeyBase, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="user.id", index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    last_seen: datetime = Field(default_factory=lambda: datetime.now(UTC))


class DeviceKeyCreate(DeviceKeyBase):
    pass


class DeviceKeyRead(DeviceKeyBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    last_seen: datetime


class SyncBlobBase(SQLModel):
    encrypted_data: str
    iv: Optional[str] = Field(default=None)
    salt: Optional[str] = Field(default=None)
    sequence_number: int = Field(default=1, index=True)
    version: int = Field(default=1)


class SyncBlob(SyncBlobBase, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="user.id", index=True)
    device_id: Optional[UUID] = Field(default=None, foreign_key="devicekey.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class SyncBlobCreate(SyncBlobBase):
    device_id: Optional[UUID] = None


class SyncBlobRead(SyncBlobBase):
    id: UUID
    user_id: UUID
    device_id: Optional[UUID]
    created_at: datetime

