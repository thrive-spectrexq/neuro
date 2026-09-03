"""
Unit tests for the layered memory management service.
"""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.memory import MemoryType
from app.models.user import User
from app.services.memory.manager import memory_manager


@pytest.mark.asyncio
async def test_store_and_retrieve_memory(test_session: AsyncSession, test_user: User):
    mem = await memory_manager.store(
        session=test_session,
        user_id=test_user.id,
        key="favorite_editor",
        content="User prefers Neovim with Lua config",
        memory_type=MemoryType.LONG_TERM,
        confidence=0.95,
    )
    assert mem.id is not None
    assert mem.key == "favorite_editor"
    assert mem.confidence == 0.95

    # Retrieve memory
    fetched = await memory_manager.get_by_id(test_session, test_user.id, mem.id)
    assert fetched is not None
    assert fetched.content == "User prefers Neovim with Lua config"


@pytest.mark.asyncio
async def test_memory_upsert_by_key(test_session: AsyncSession, test_user: User):
    # Store initial
    await memory_manager.store(
        session=test_session,
        user_id=test_user.id,
        key="theme_preference",
        content="Dark mode",
        memory_type=MemoryType.SESSION,
    )

    # Upsert with new content
    updated = await memory_manager.store(
        session=test_session,
        user_id=test_user.id,
        key="theme_preference",
        content="High contrast dark mode",
        memory_type=MemoryType.SESSION,
    )

    assert updated.content == "High contrast dark mode"

    # Verify single active record exists for this key
    memories = await memory_manager.list_memories(test_session, test_user.id, memory_type=MemoryType.SESSION)
    matching = [m for m in memories if m.key == "theme_preference"]
    assert len(matching) == 1


@pytest.mark.asyncio
async def test_memory_soft_and_hard_delete(test_session: AsyncSession, test_user: User):
    mem = await memory_manager.store(
        session=test_session,
        user_id=test_user.id,
        key="temp_fact",
        content="To be deleted",
        memory_type=MemoryType.SHORT_TERM,
    )

    # Soft delete
    deleted = await memory_manager.delete(test_session, test_user.id, mem.id, hard_delete=False)
    assert deleted is True

    # Not found in active list
    memories = await memory_manager.list_memories(test_session, test_user.id)
    assert not any(m.id == mem.id for m in memories)
