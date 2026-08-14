import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.ext.asyncio.session import AsyncSession
from sqlmodel import SQLModel

from app.core.config import get_settings
from app.core.exceptions import DatabaseConnectionError

logger = logging.getLogger("neuro.database")
settings = get_settings()

db_url = settings.DATABASE_URL
if db_url.startswith("sqlite://"):
    db_url = db_url.replace("sqlite://", "sqlite+aiosqlite://", 1)

is_sqlite = "sqlite" in db_url
connect_args = {"timeout": 30, "check_same_thread": False} if is_sqlite else {}

engine = create_async_engine(
    db_url,
    echo=settings.NEURO_ENV == "development",
    future=True,
    pool_pre_ping=True,
    connect_args=connect_args,
)


@event.listens_for(engine.sync_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Enable foreign key enforcement and write-ahead logging (WAL) for SQLite."""
    try:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA synchronous=NORMAL;")
        cursor.close()
    except Exception as exc:
        logger.debug(f"SQLite PRAGMA setup note: {exc}")


async def create_db_and_tables() -> None:
    try:
        async with engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.create_all)
            await conn.execute(
                text("CREATE VIRTUAL TABLE IF NOT EXISTS note_fts USING fts5(id UNINDEXED, title, content);")
            )
        logger.info("Database schema initialized successfully.")
    except Exception as exc:
        logger.error(f"Failed to create database tables: {exc}", exc_info=True)
        raise DatabaseConnectionError(detail=f"Database initialization failed: {exc}") from exc


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSession(engine, expire_on_commit=False) as session:
        try:
            yield session
        except Exception as exc:
            await session.rollback()
            raise exc


@asynccontextmanager
async def get_session_context() -> AsyncGenerator[AsyncSession, None]:
    """Async context manager for background tasks, CLI commands, and worker jobs."""
    async with AsyncSession(engine, expire_on_commit=False) as session:
        try:
            yield session
        except Exception as exc:
            await session.rollback()
            raise exc
