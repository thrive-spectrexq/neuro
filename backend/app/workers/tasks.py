import asyncio
from celery import Celery

from app.core.config import get_settings
from app.core.database import engine
from sqlalchemy.ext.asyncio.session import AsyncSession
from app.services.ingestion.pipeline import ingestion_pipeline
from app.models.note import Note
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
def process_import(source: str):
    # Stub for background ingestion
    return f"Processed {source}"

@celery_app.task
def evaluate_automation_rules(event_type: str, payload: dict):
    async def _run():
        async with AsyncSession(engine) as db:
            await automation_engine.evaluate_triggers(db, event_type, payload)
            
    asyncio.run(_run())
    return f"Evaluated automation rules for {event_type}"
