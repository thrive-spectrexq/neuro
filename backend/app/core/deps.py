from typing import Annotated

from fastapi import Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.user import User


async def get_db(session: AsyncSession = Depends(get_session)) -> AsyncSession:
    """Yields async session with proper typing."""
    return session


async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Wraps get_current_user + checks is_active."""
    if not getattr(current_user, "is_active", True):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    return current_user


class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1)
    size: int = Field(default=20, ge=1, le=100)


def get_pagination(page: int = Query(default=1, ge=1), size: int = Query(default=20, ge=1, le=100)) -> PaginationParams:
    return PaginationParams(page=page, size=size)
