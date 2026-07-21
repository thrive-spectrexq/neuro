from typing import Literal

from pydantic import BaseModel, Field, HttpUrl


class URLImport(BaseModel):
    url: HttpUrl = Field(..., description="The URL to import content from")


class VaultImport(BaseModel):
    source_path: str = Field(..., min_length=1, description="Local or remote path to the vault")
    format: Literal["obsidian", "notion", "roam"] = Field(..., description="Format of the vault being imported")


class IngestResponse(BaseModel):
    message: str = Field(..., description="Result message of the import operation")
    filename: str | None = Field(default=None, description="Name of the imported file, if applicable")
    status: str = Field(..., description="Status of the import: success, pending, error")
