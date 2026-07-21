import pytest
from app.schemas.tag import TagCreate, TagResponse
from app.schemas.analytics import SystemStatsResponse

def test_tag_schemas():
    tag_in = TagCreate(name="  Machine-Learning  ")
    assert tag_in.name == "  Machine-Learning  "

def test_system_stats_schema():
    stats = SystemStatsResponse(
        total_notes=10,
        total_projects=2,
        total_tasks=5,
        total_tags=4,
        total_automations=1,
        total_comments=3,
        tasks_by_status={"todo": 3, "done": 2},
        notes_by_content_type={"markdown": 10}
    )
    assert stats.total_notes == 10
    assert stats.tasks_by_status["todo"] == 3
