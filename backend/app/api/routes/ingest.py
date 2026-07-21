from fastapi import APIRouter, Depends, File, UploadFile
from pydantic import BaseModel

from app.core.security import get_current_user
from app.workers.tasks import (
    process_import_task,
    process_markdown_task,
    process_pdf_task,
)

router = APIRouter()


class URLImport(BaseModel):
    url: str


class VaultImport(BaseModel):
    source_path: str
    format: str


@router.post("/pdf")
async def ingest_pdf(file: UploadFile = File(...), current_user: str = Depends(get_current_user)):
    file_bytes = await file.read()
    # Dispatch to celery
    process_pdf_task.delay(file_bytes, file.filename, str(current_user.id))
    return {"message": "PDF ingestion started", "filename": file.filename}


@router.post("/markdown")
async def ingest_markdown(files: list[UploadFile] = File(...), current_user: str = Depends(get_current_user)):
    for file in files:
        content = (await file.read()).decode("utf-8")
        process_markdown_task.delay(content, file.filename, str(current_user.id))
    return {"message": f"Started ingestion for {len(files)} markdown files"}


@router.post("/url")
async def import_url(data: URLImport, current_user: str = Depends(get_current_user)):
    # Stub for URL ingestion
    return {"url": data.url, "status": "ingested"}


@router.post("/vault")
async def import_vault(data: VaultImport, current_user: str = Depends(get_current_user)):
    if data.format not in ["obsidian", "notion", "roam"]:
        return {"error": "Unsupported format. Supported: obsidian, notion, roam"}

    process_import_task.delay(data.source_path, data.format, str(current_user.id))
    return {"message": f"Started {data.format} import from {data.source_path}"}
