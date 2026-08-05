import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import get_current_user_optional
from app.models.user import User
from app.services.search.engine import search_engine

router = APIRouter()


@router.get("")
async def search_notes(
    q: str = Query(..., description="Search query"),
    project_id: uuid.UUID | None = Query(None, description="Workspace project ID to search within"),
    limit: int = Query(10, description="Max results"),
    session: AsyncSession = Depends(get_session),
    current_user: User | None = Depends(get_current_user_optional),
):
    user_id = current_user.id if (current_user and hasattr(current_user, "id")) else None
    results = await search_engine.hybrid_search(
        session=session, query=q, user_id=user_id, project_id=project_id, limit=limit
    )
    return {"query": q, "results": results}
