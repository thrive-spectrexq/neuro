import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.memory import MemoryType
from app.models.user import User
from app.schemas.memory import MemoryCreate, MemoryResponse, MemoryUpdate
from app.services.memory.manager import memory_manager

router = APIRouter()


@router.get("", response_model=list[MemoryResponse])
async def list_memories(
    memory_type: MemoryType | None = Query(None, description="Filter by memory tier"),
    include_expired: bool = Query(False, description="Whether to include expired memories"),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Retrieve memories belonging to the authenticated user."""
    return await memory_manager.list_memories(
        session=session,
        user_id=current_user.id,
        memory_type=memory_type,
        include_expired=include_expired,
    )


@router.post("", response_model=MemoryResponse, status_code=status.HTTP_201_CREATED)
async def create_memory(
    mem_in: MemoryCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Store or update a memory fact in the user's brain."""
    return await memory_manager.store(
        session=session,
        user_id=current_user.id,
        key=mem_in.key,
        content=mem_in.content,
        memory_type=mem_in.memory_type,
        metadata=mem_in.metadata_,
        confidence=mem_in.confidence,
        ttl_seconds=mem_in.ttl_seconds,
    )


@router.get("/{memory_id}", response_model=MemoryResponse)
async def get_memory(
    memory_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Retrieve a single memory by ID."""
    mem = await memory_manager.get_by_id(session, current_user.id, memory_id)
    if not mem:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Memory not found")
    return mem


@router.patch("/{memory_id}", response_model=MemoryResponse)
async def update_memory(
    memory_id: uuid.UUID,
    update_in: MemoryUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update contents, confidence, or TTL of an existing memory."""
    mem = await memory_manager.get_by_id(session, current_user.id, memory_id)
    if not mem:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Memory not found")

    if update_in.content is not None:
        mem.content = update_in.content
    if update_in.confidence is not None:
        mem.confidence = update_in.confidence
    if update_in.metadata_ is not None:
        mem.metadata_ = update_in.metadata_
    if update_in.ttl_seconds is not None:
        mem.ttl_seconds = update_in.ttl_seconds

    session.add(mem)
    await session.commit()
    await session.refresh(mem)
    return mem


@router.delete("/{memory_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_memory(
    memory_id: uuid.UUID,
    hard: bool = Query(False, description="Perform permanent hard delete if true"),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete a memory item."""
    success = await memory_manager.delete(session, current_user.id, memory_id, hard_delete=hard)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Memory not found")
    return None
