from typing import Dict, List, Any
from pydantic import BaseModel


class SystemStatsResponse(BaseModel):
    total_notes: int
    total_projects: int
    total_tasks: int
    total_tags: int
    total_automations: int
    total_comments: int
    tasks_by_status: Dict[str, int]
    notes_by_content_type: Dict[str, int]


class ActivityItemResponse(BaseModel):
    id: str
    action: str
    entity_type: str
    entity_id: str
    details: Dict[str, Any] = {}
    timestamp: str
