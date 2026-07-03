from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import Optional

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.sync import SyncBlob, SyncBlobCreate, SyncBlobRead
from app.models.user import User

router = APIRouter()


@router.post("/", response_model=SyncBlobRead)
def upload_sync_blob(
    *,
    session: Session = Depends(get_session),
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
    session.commit()
    session.refresh(blob)
    return blob


@router.get("/latest", response_model=Optional[SyncBlobRead])
def get_latest_sync_blob(
    *,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Optional[SyncBlobRead]:
    statement = (
        select(SyncBlob)
        .where(SyncBlob.user_id == current_user.id)
        .order_by(SyncBlob.created_at.desc())
        .limit(1)
    )
    blob = session.exec(statement).first()
    return blob
