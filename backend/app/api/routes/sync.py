from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.sync import SyncBlob, SyncBlobCreate, SyncBlobRead
from app.models.user import User

router = APIRouter()


@router.post("/", response_model=SyncBlobRead)
async def upload_sync_blob(
    *,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
    blob_in: SyncBlobCreate,
) -> SyncBlobRead:
    if blob_in.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to sync for this user",
        )
    
    blob = SyncBlob.model_validate(blob_in)
    session.add(blob)
    await session.commit()
    await session.refresh(blob)
    return blob


@router.get("/latest", response_model=Optional[SyncBlobRead])
async def get_latest_sync_blob(
    *,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Optional[SyncBlobRead]:
    statement = (
        select(SyncBlob)
        .where(SyncBlob.user_id == current_user.id)
        .order_by(SyncBlob.created_at.desc())
        .limit(1)
    )
    result = await session.execute(statement)
    return result.scalars().first()

@router.get("/history", response_model=list[SyncBlobRead])
async def get_sync_history(
    *,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
    limit: int = 10
):
    statement = (
        select(SyncBlob)
        .where(SyncBlob.user_id == current_user.id)
        .order_by(SyncBlob.created_at.desc())
        .limit(limit)
    )
    result = await session.execute(statement)
    return result.scalars().all()

@router.delete("/", status_code=status.HTTP_204_NO_CONTENT)
async def clear_sync_data(
    *,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    statement = select(SyncBlob).where(SyncBlob.user_id == current_user.id)
    result = await session.execute(statement)
    blobs = result.scalars().all()
    for blob in blobs:
        await session.delete(blob)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
