from fastapi import APIRouter

from app.api.routes.agents import router as agents_router
from app.api.routes.governance import router as governance_router
from app.api.routes.models import router as models_router
from app.api.routes.tools import router as tools_router
from app.api.routes.vision import router as vision_router

api_v2_router = APIRouter()

api_v2_router.include_router(agents_router, prefix="/agents", tags=["Agents"])
api_v2_router.include_router(tools_router, prefix="/tools", tags=["Tools"])
api_v2_router.include_router(models_router, prefix="/models", tags=["Models"])
api_v2_router.include_router(governance_router, prefix="/governance", tags=["Governance"])
api_v2_router.include_router(vision_router, prefix="/vision", tags=["Vision"])
