import asyncio
import uuid
from celery import Celery

from app.core.config import get_settings
from app.core.database import engine
from sqlalchemy.ext.asyncio.session import AsyncSession
from app.services.ingestion.pipeline import ingestion_pipeline
from app.models.note import Note, NoteLink
from app.models.audit import AuditLog
from sqlmodel import select
from app.services.search.engine import search_engine
from app.services.automation.engine import automation_engine

settings = get_settings()

celery_app = Celery(
    "neuro_workers",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

def run_async(coro):
    loop = asyncio.get_event_loop()
    if loop.is_closed():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)

@celery_app.task
def process_pdf_task(file_bytes: bytes, filename: str, user_id: str):
    async def _process():
        result = await ingestion_pipeline.process_pdf(file_bytes)
        async with AsyncSession(engine) as session:
            note = Note(
                title=filename,
                content=result["content"],
                user_id=user_id,
                metadata_=result["metadata"]
            )
            session.add(note)
            await session.commit()
            await search_engine.index_note(session, note)
            
    run_async(_process())
    return f"Processed PDF {filename}"

@celery_app.task
def process_markdown_task(content: str, filename: str, user_id: str):
    async def _process():
        result = await ingestion_pipeline.process_markdown(content)
        async with AsyncSession(engine) as session:
            note = Note(
                title=result["metadata"].get("title", filename),
                content=result["content"],
                user_id=user_id,
                metadata_=result["metadata"]
            )
            session.add(note)
            await session.commit()
            await search_engine.index_note(session, note)

    run_async(_process())
    return f"Processed Markdown {filename}"

@celery_app.task
def embed_note(note_id: str, content: str):
    # Stub for generating embeddings in the background
    return f"Embedded {note_id}"

@celery_app.task
def process_import_task(source_path: str, format: str, user_id: str):
    async def _process():
        results = await ingestion_pipeline.process_vault_import(source_path, format)
        async with AsyncSession(engine) as session:
            for result in results:
                note = Note(
                    title=result["metadata"].get("title", "Untitled Note"),
                    content=result["content"],
                    user_id=user_id,
                    metadata_=result["metadata"]
                )
                session.add(note)
                await session.commit()
                await search_engine.index_note(session, note)

    run_async(_process())
    return f"Processed {format} import from {source_path}"

@celery_app.task
def evaluate_automation_rules(event_type: str, payload: dict):
    async def _run():
        async with AsyncSession(engine) as db:
            await automation_engine.evaluate_triggers(db, event_type, payload)
            
    asyncio.run(_run())
    return f"Evaluated automation rules for {event_type}"

@celery_app.task
def prune_audit_logs_task():
    """Delete audit logs older than 90 days."""
    async def _prune():
        from datetime import UTC, datetime, timedelta
        from sqlalchemy import delete
        
        async with AsyncSession(engine) as session:
            cutoff = datetime.now(UTC) - timedelta(days=90)
            stmt = delete(AuditLog).where(AuditLog.timestamp < cutoff)
            await session.execute(stmt)
            await session.commit()
            
    try:
        asyncio.run(_prune())
    except Exception as e:
        print(f"Error pruning audit logs: {e}")

@celery_app.task
def extract_entities_task(note_id: str):
    async def _process():
        async with AsyncSession(engine) as session:
            note = await session.get(Note, uuid.UUID(note_id))
            if not note:
                return
            
            entities = await ingestion_pipeline.extract_entities(note.content)
            
            for entity in set(entities):
                stmt = select(Note).where(Note.title == entity, Note.user_id == note.user_id, Note.project_id == note.project_id)
                result = await session.execute(stmt)
                entity_note = result.scalar_one_or_none()
                
                if not entity_note:
                    entity_note = Note(title=entity, content="", user_id=note.user_id, project_id=note.project_id)
                    session.add(entity_note)
                    await session.flush()
                    await session.refresh(entity_note)
                    
                link_stmt = select(NoteLink).where(NoteLink.source_id == note.id, NoteLink.target_id == entity_note.id)
                existing_link = (await session.execute(link_stmt)).scalar_one_or_none()
                
                if not existing_link and note.id != entity_note.id:
                    link = NoteLink(source_id=note.id, target_id=entity_note.id)
                    session.add(link)
                    
            await session.commit()
            
    run_async(_process())
    return f"Extracted entities for note {note_id}"
