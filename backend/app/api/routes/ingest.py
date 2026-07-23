import os
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, HttpUrl
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.note import Note
from app.models.user import User
from app.services.ingestion.pipeline import ingestion_pipeline
from app.services.search.engine import search_engine
from app.workers.tasks import (
    process_import_task,
    process_markdown_task,
    process_pdf_task,
)

router = APIRouter()


class URLImport(BaseModel):
    url: HttpUrl


class VaultImport(BaseModel):
    source_path: str
    format: str


@router.post("/pdf")
async def ingest_pdf(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    file_bytes = await file.read()
    process_pdf_task.delay(file_bytes, file.filename or "uploaded.pdf", str(current_user.id))
    return {"message": "PDF ingestion started", "filename": file.filename}


@router.post("/markdown")
async def ingest_markdown(
    files: list[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
):
    for file in files:
        content = (await file.read()).decode("utf-8")
        process_markdown_task.delay(content, file.filename or "uploaded.md", str(current_user.id))
    return {"message": f"Started ingestion for {len(files)} markdown files"}


@router.post("/url")
async def import_url(
    data: URLImport,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    url_str = str(data.url)
    res = await ingestion_pipeline.process_url(url_str)
    title = res.get("metadata", {}).get("title", url_str)
    content = res.get("content", "")

    note = Note(
        title=title,
        content=f"Source: {url_str}\n\n{content}",
        user_id=current_user.id,
        metadata_=res.get("metadata", {}),
    )
    session.add(note)
    await session.commit()
    await session.refresh(note)
    await search_engine.index_note(session, note)

    return {"message": "URL ingested successfully", "note_id": str(note.id), "title": title}


@router.post("/vault")
async def import_vault(
    data: VaultImport,
    current_user: User = Depends(get_current_user),
):
    if data.format not in ["obsidian", "notion", "roam"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported format. Supported: obsidian, notion, roam",
        )

    clean_path = os.path.abspath(data.source_path.strip())
    if not os.path.exists(clean_path) or not os.path.isdir(clean_path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Vault path '{data.source_path}' does not exist or is not a directory.",
        )

    process_import_task.delay(clean_path, data.format, str(current_user.id))
    return {"message": f"Started {data.format} import from {clean_path}"}

