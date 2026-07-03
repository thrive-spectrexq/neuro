from celery import Celery

from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "neuro_workers",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

@celery_app.task
def embed_note(note_id: str, content: str):
    # Stub for generating embeddings in the background
    return f"Embedded {note_id}"

@celery_app.task
def process_import(source: str):
    # Stub for background ingestion
    return f"Processed {source}"
