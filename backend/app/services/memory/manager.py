import logging
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import delete, select

from app.models.memory import Memory, MemoryType

logger = logging.getLogger("neuro.memory")


class MemoryManager:
    """
    Service managing multi-tiered user memory:
    - Short-term: Conversational buffer with auto-expiry
    - Session: Working context across an active task
    - Long-term: Persistent facts, user preferences, and profile
    """

    async def store(
        self,
        session: AsyncSession,
        user_id: uuid.UUID,
        key: str,
        content: str,
        memory_type: MemoryType = MemoryType.SESSION,
        metadata: dict[str, Any] | None = None,
        confidence: float = 1.0,
        ttl_seconds: int | None = None,
    ) -> Memory:
        now = datetime.now(UTC)
        expires_at = now + timedelta(seconds=ttl_seconds) if ttl_seconds else None

        # Check if an active memory with the same key & type exists to update it
        stmt = (
            select(Memory)
            .where(
                Memory.user_id == user_id,
                Memory.key == key,
                Memory.memory_type == memory_type,
                Memory.is_deleted == False,  # noqa: E712
            )
        )
        res = await session.execute(stmt)
        existing = res.scalars().first()

        if existing:
            existing.content = content
            existing.metadata_ = metadata or {}
            existing.confidence = confidence
            existing.ttl_seconds = ttl_seconds
            existing.expires_at = expires_at
            existing.updated_at = now
            session.add(existing)
            await session.commit()
            await session.refresh(existing)
            return existing

        new_mem = Memory(
            user_id=user_id,
            memory_type=memory_type,
            key=key,
            content=content,
            metadata_=metadata or {},
            confidence=confidence,
            ttl_seconds=ttl_seconds,
            created_at=now,
            updated_at=now,
            expires_at=expires_at,
        )
        session.add(new_mem)
        await session.commit()
        await session.refresh(new_mem)
        return new_mem

    async def list_memories(
        self,
        session: AsyncSession,
        user_id: uuid.UUID,
        memory_type: MemoryType | None = None,
        include_expired: bool = False,
    ) -> list[Memory]:
        stmt = select(Memory).where(Memory.user_id == user_id, Memory.is_deleted == False)  # noqa: E712
        if memory_type:
            stmt = stmt.where(Memory.memory_type == memory_type)
        if not include_expired:
            now = datetime.now(UTC)
            stmt = stmt.where((Memory.expires_at == None) | (Memory.expires_at > now))  # noqa: E711

        stmt = stmt.order_by(Memory.updated_at.desc())
        res = await session.execute(stmt)
        return list(res.scalars().all())

    async def get_by_id(
        self,
        session: AsyncSession,
        user_id: uuid.UUID,
        memory_id: uuid.UUID,
    ) -> Memory | None:
        stmt = select(Memory).where(
            Memory.id == memory_id,
            Memory.user_id == user_id,
            Memory.is_deleted == False,  # noqa: E712
        )
        res = await session.execute(stmt)
        return res.scalars().first()

    async def delete(
        self,
        session: AsyncSession,
        user_id: uuid.UUID,
        memory_id: uuid.UUID,
        hard_delete: bool = False,
    ) -> bool:
        mem = await self.get_by_id(session, user_id, memory_id)
        if not mem:
            return False

        if hard_delete:
            await session.delete(mem)
        else:
            mem.is_deleted = True
            mem.updated_at = datetime.now(UTC)
            session.add(mem)

        await session.commit()
        return True

    async def purge_expired(
        self,
        session: AsyncSession,
        user_id: uuid.UUID | None = None,
    ) -> int:
        now = datetime.now(UTC)
        stmt = delete(Memory).where(
            Memory.expires_at != None,  # noqa: E711
            Memory.expires_at <= now,
        )
        if user_id:
            stmt = stmt.where(Memory.user_id == user_id)
        res = await session.execute(stmt)
        await session.commit()
        return res.rowcount or 0


memory_manager = MemoryManager()
