from datetime import UTC, datetime
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
    iv: str | None = Field(default=None)
    salt: str | None = Field(default=None)
    sequence_number: int = Field(default=1, index=True)
    version: int = Field(default=1)


class SyncBlob(SyncBlobBase, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="user.id", index=True)
    device_id: UUID | None = Field(default=None, foreign_key="devicekey.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class SyncBlobCreate(SyncBlobBase):
    device_id: UUID | None = None


class SyncBlobRead(SyncBlobBase):
    id: UUID
    user_id: UUID
    device_id: UUID | None
    created_at: datetime
