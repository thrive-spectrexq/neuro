from typing import Any

from pydantic import BaseModel


class SystemStatsResponse(BaseModel):
    total_notes: int
    total_projects: int
    total_tasks: int
    total_tags: int
    total_automations: int
    total_comments: int
    tasks_by_status: dict[str, int]
    notes_by_content_type: dict[str, int]


class ActivityItemResponse(BaseModel):
    id: str
    action: str
    entity_type: str
    entity_id: str
    details: dict[str, Any] = {}
    timestamp: str
