import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class SyncBlobCreate(BaseModel):
    encrypted_data: str = Field(..., min_length=1, description="Encrypted content blob for synchronization")
    version: int = Field(default=1, ge=1, description="Version number of the sync blob")

class SyncBlobResponse(BaseModel):
    id: uuid.UUID = Field(..., description="Unique ID of the sync blob")
    user_id: uuid.UUID = Field(..., description="ID of the user who owns the blob")
    encrypted_data: str = Field(..., description="Encrypted content blob")
    version: int = Field(..., description="Version number")
    created_at: datetime = Field(..., description="When the blob was created")
    
    model_config = ConfigDict(from_attributes=True)

class SyncStatusResponse(BaseModel):
    last_synced: datetime | None = Field(default=None, description="Timestamp of the last successful sync")
    blob_count: int = Field(..., ge=0, description="Total number of sync blobs")
    latest_version: int | None = Field(default=None, description="The highest version number currently synced")
