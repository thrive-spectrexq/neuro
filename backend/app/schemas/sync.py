import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DeviceKeyCreate(BaseModel):
    device_name: str = Field(..., min_length=1, max_length=100)
    public_key: str = Field(..., min_length=10)


class DeviceKeyResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    device_name: str
    public_key: str
    key_fingerprint: str
    created_at: datetime
    last_seen: datetime

    model_config = ConfigDict(from_attributes=True)


class SyncBlobCreate(BaseModel):
    encrypted_data: str = Field(..., min_length=1, description="Encrypted content blob for synchronization")
    iv: str | None = Field(default=None, description="Initialization Vector (base64)")
    salt: str | None = Field(default=None, description="Key derivation Salt (base64)")
    device_id: uuid.UUID | None = Field(default=None, description="Device key ID pushing the blob")
    version: int = Field(default=1, ge=1, description="Version number of the sync blob")


class SyncBlobResponse(BaseModel):
    id: uuid.UUID = Field(..., description="Unique ID of the sync blob")
    user_id: uuid.UUID = Field(..., description="ID of the user who owns the blob")
    device_id: uuid.UUID | None = Field(default=None)
    encrypted_data: str = Field(..., description="Encrypted content blob")
    iv: str | None = Field(default=None)
    salt: str | None = Field(default=None)
    sequence_number: int = Field(default=1)
    version: int = Field(..., description="Version number")
    created_at: datetime = Field(..., description="When the blob was created")

    model_config = ConfigDict(from_attributes=True)


class SyncPushRequest(BaseModel):
    blobs: list[SyncBlobCreate]


class SyncPullResponse(BaseModel):
    blobs: list[SyncBlobResponse]
    latest_sequence: int


class SyncStatusResponse(BaseModel):
    last_synced: datetime | None = Field(default=None, description="Timestamp of the last successful sync")
    blob_count: int = Field(..., ge=0, description="Total number of sync blobs")
    latest_version: int | None = Field(default=None, description="The highest version number currently synced")
    registered_devices: int = Field(default=0)


class SyncVerifyResponse(BaseModel):
    valid: bool
    blob_id: uuid.UUID
    byte_length: int
    algorithm: str
