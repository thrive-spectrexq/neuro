from fastapi import APIRouter

from app.api.routes import ai, auth, graph, ingest, notes, projects, search, tasks, sync

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(notes.router, prefix="/notes", tags=["notes"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(search.router, prefix="/search", tags=["search"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(ingest.router, prefix="/ingest", tags=["ingest"])
api_router.include_router(graph.router, prefix="/graph", tags=["graph"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(sync.router, prefix="/sync", tags=["sync"])
