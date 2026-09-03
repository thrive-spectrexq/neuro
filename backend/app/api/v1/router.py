from fastapi import APIRouter

from app.api.routes import (
    agent,
    ai,
    analytics,
    auth,
    automations,
    comments,
    graph,
    graph_intelligence,
    ingest,
    memory,
    notes,
    obsidian,
    privacy,
    projects,
    roadmap,
    search,
    sync,
    tags,
    tasks,
    voice,
)

api_router = APIRouter()
api_router.include_router(agent.router, prefix="/agent", tags=["agent"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(notes.router, prefix="/notes", tags=["notes"])
api_router.include_router(memory.router, prefix="/memory", tags=["memory"])
api_router.include_router(privacy.router, prefix="/privacy", tags=["privacy"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(comments.router, prefix="/comments", tags=["comments"])
api_router.include_router(voice.router, prefix="/voice", tags=["voice"])
api_router.include_router(search.router, prefix="/search", tags=["search"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(ingest.router, prefix="/ingest", tags=["ingest"])
api_router.include_router(graph.router, prefix="/graph", tags=["graph"])
api_router.include_router(roadmap.router, prefix="/roadmap", tags=["roadmap"])
api_router.include_router(obsidian.router, prefix="/obsidian", tags=["obsidian"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(sync.router, prefix="/sync", tags=["sync"])
api_router.include_router(automations.router, prefix="/automations", tags=["automations"])
api_router.include_router(tags.router, prefix="/tags", tags=["tags"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(graph_intelligence.router, prefix="/graph-intel", tags=["graph-intelligence"])
