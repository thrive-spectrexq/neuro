from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import get_current_user

router = APIRouter()

@router.get("")
async def get_graph(
    session: AsyncSession = Depends(get_session),
    current_user: str = Depends(get_current_user)
):
    # Return some initial dummy data so the UI isn't empty and doesn't crash
    return {
        "nodes": [
            {"id": "1", "name": "Artificial Intelligence", "type": "note"},
            {"id": "2", "name": "Machine Learning", "type": "note"},
            {"id": "3", "name": "Neural Networks", "type": "note"},
            {"id": "4", "name": "Deep Learning", "type": "note"},
            {"id": "t1", "name": "#Tech", "type": "tag"}
        ],
        "links": [
            {"source": "1", "target": "2"},
            {"source": "2", "target": "3"},
            {"source": "3", "target": "4"},
            {"source": "1", "target": "t1"},
            {"source": "4", "target": "t1"}
        ]
    }
