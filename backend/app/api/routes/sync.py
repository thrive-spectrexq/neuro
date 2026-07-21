import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import func, select

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.sync import DeviceKey, SyncBlob
from app.models.user import User
from app.schemas.sync import (
    DeviceKeyCreate,
    DeviceKeyResponse,
    SyncBlobCreate,
    SyncBlobResponse,
    SyncPullResponse,
    SyncPushRequest,
    SyncStatusResponse,
    SyncVerifyResponse,
)
from app.services.crypto import crypto_service

router = APIRouter()


@router.post("/devices", response_model=DeviceKeyResponse, status_code=201)
async def register_device_key(
    key_in: DeviceKeyCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id if hasattr(current_user, "id") else uuid.UUID(current_user.get("id"))
    fingerprint = crypto_service.compute_key_fingerprint(key_in.public_key)

    # Check if key already registered
    stmt = select(DeviceKey).where(DeviceKey.user_id == user_id, DeviceKey.key_fingerprint == fingerprint)
    existing = (await session.execute(stmt)).scalars().first()
    if existing:
        existing.last_seen = datetime.now(UTC)
        session.add(existing)
        await session.commit()
        await session.refresh(existing)
        return existing

    device = DeviceKey(
        user_id=user_id,
        device_name=key_in.device_name,
        public_key=key_in.public_key,
        key_fingerprint=fingerprint,
    )
    session.add(device)
    await session.commit()
    await session.refresh(device)
    return device


@router.get("/devices", response_model=list[DeviceKeyResponse])
async def list_device_keys(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id if hasattr(current_user, "id") else uuid.UUID(current_user.get("id"))
    stmt = select(DeviceKey).where(DeviceKey.user_id == user_id).order_by(DeviceKey.created_at.desc())
    result = await session.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=SyncBlobResponse, status_code=201)
@router.post("/", response_model=SyncBlobResponse, status_code=201)
async def upload_sync_blob(
    blob_in: SyncBlobCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id if hasattr(current_user, "id") else uuid.UUID(current_user.get("id"))

    # Compute sequence number
    seq_stmt = select(func.coalesce(func.max(SyncBlob.sequence_number), 0)).where(SyncBlob.user_id == user_id)
    current_max_seq = (await session.execute(seq_stmt)).scalar() or 0

    blob = SyncBlob(
        user_id=user_id,
        device_id=blob_in.device_id,
        encrypted_data=blob_in.encrypted_data,
        iv=blob_in.iv,
        salt=blob_in.salt,
        sequence_number=current_max_seq + 1,
        version=blob_in.version,
    )
    session.add(blob)
    await session.commit()
    await session.refresh(blob)
    return blob


@router.post("/push", response_model=list[SyncBlobResponse])
async def push_sync_blobs(
    push_req: SyncPushRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id if hasattr(current_user, "id") else uuid.UUID(current_user.get("id"))

    seq_stmt = select(func.coalesce(func.max(SyncBlob.sequence_number), 0)).where(SyncBlob.user_id == user_id)
    current_max_seq = (await session.execute(seq_stmt)).scalar() or 0

    pushed_blobs = []
    for idx, b_in in enumerate(push_req.blobs):
        blob = SyncBlob(
            user_id=user_id,
            device_id=b_in.device_id,
            encrypted_data=b_in.encrypted_data,
            iv=b_in.iv,
            salt=b_in.salt,
            sequence_number=current_max_seq + idx + 1,
            version=b_in.version,
        )
        session.add(blob)
        pushed_blobs.append(blob)

    await session.commit()
    for b in pushed_blobs:
        await session.refresh(b)

    return pushed_blobs


@router.get("/pull", response_model=SyncPullResponse)
async def pull_sync_blobs(
    since_sequence: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id if hasattr(current_user, "id") else uuid.UUID(current_user.get("id"))

    stmt = (
        select(SyncBlob)
        .where(SyncBlob.user_id == user_id, SyncBlob.sequence_number > since_sequence)
        .order_by(SyncBlob.sequence_number.asc())
        .limit(limit)
    )
    res = await session.execute(stmt)
    blobs = res.scalars().all()

    max_seq_stmt = select(func.coalesce(func.max(SyncBlob.sequence_number), 0)).where(SyncBlob.user_id == user_id)
    latest_seq = (await session.execute(max_seq_stmt)).scalar() or 0

    return SyncPullResponse(
        blobs=[SyncBlobResponse.model_validate(b) for b in blobs],
        latest_sequence=latest_seq,
    )


@router.get("/latest", response_model=SyncBlobResponse | None)
async def get_latest_sync_blob(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> SyncBlobResponse | None:
    user_id = current_user.id if hasattr(current_user, "id") else uuid.UUID(current_user.get("id"))
    statement = select(SyncBlob).where(SyncBlob.user_id == user_id).order_by(SyncBlob.sequence_number.desc()).limit(1)
    result = await session.execute(statement)
    return result.scalars().first()


@router.get("/status", response_model=SyncStatusResponse)
async def get_sync_status(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id if hasattr(current_user, "id") else uuid.UUID(current_user.get("id"))

    cnt_stmt = select(func.count(SyncBlob.id)).where(SyncBlob.user_id == user_id)
    count = (await session.execute(cnt_stmt)).scalar() or 0

    dev_stmt = select(func.count(DeviceKey.id)).where(DeviceKey.user_id == user_id)
    dev_count = (await session.execute(dev_stmt)).scalar() or 0

    latest_blob = await get_latest_sync_blob(session=session, current_user=current_user)

    return SyncStatusResponse(
        last_synced=latest_blob.created_at if latest_blob else None,
        blob_count=count,
        latest_version=latest_blob.version if latest_blob else None,
        registered_devices=dev_count,
    )


@router.get("/history", response_model=list[SyncBlobResponse])
async def get_sync_history(
    limit: int = Query(10, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id if hasattr(current_user, "id") else uuid.UUID(current_user.get("id"))
    statement = (
        select(SyncBlob).where(SyncBlob.user_id == user_id).order_by(SyncBlob.sequence_number.desc()).limit(limit)
    )
    result = await session.execute(statement)
    return result.scalars().all()


@router.post("/verify/{blob_id}", response_model=SyncVerifyResponse)
async def verify_sync_blob(
    blob_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id if hasattr(current_user, "id") else uuid.UUID(current_user.get("id"))
    blob = await session.get(SyncBlob, blob_id)
    if not blob or blob.user_id != user_id:
        raise HTTPException(status_code=404, detail="Sync blob not found")

    res = crypto_service.verify_zero_knowledge_envelope(blob.encrypted_data, blob.iv, blob.salt)
    return SyncVerifyResponse(
        valid=res["valid"],
        blob_id=blob.id,
        byte_length=res.get("byte_length", 0),
        algorithm=res.get("algorithm", "AES-256-GCM"),
    )


@router.delete("", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
@router.delete("/", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def clear_sync_data(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id if hasattr(current_user, "id") else uuid.UUID(current_user.get("id"))
    statement = select(SyncBlob).where(SyncBlob.user_id == user_id)
    result = await session.execute(statement)
    blobs = result.scalars().all()
    for blob in blobs:
        await session.delete(blob)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
