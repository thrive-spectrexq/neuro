from fastapi import APIRouter, Depends, UploadFile, File
from pydantic import BaseModel
from app.core.security import get_current_user

router = APIRouter()

class URLImport(BaseModel):
    url: str

@router.post("/file")
async def upload_file(
    file: UploadFile = File(...),
    current_user: str = Depends(get_current_user)
):
    # Stub for file ingestion
    return {"filename": file.filename, "status": "ingested"}

@router.post("/url")
async def import_url(
    data: URLImport,
    current_user: str = Depends(get_current_user)
):
    # Stub for URL ingestion
    return {"url": data.url, "status": "ingested"}
