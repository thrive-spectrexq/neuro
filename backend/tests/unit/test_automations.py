import pytest

from app.services.automation.engine import automation_engine


@pytest.mark.asyncio
async def test_evaluate_conditions_matching():
    conditions = {"tag": "research", "status": "published"}
    payload = {"tags": ["research", "ai"], "status": "published"}
    assert automation_engine._evaluate_conditions(conditions, payload) is True


@pytest.mark.asyncio
async def test_evaluate_conditions_mismatch():
    conditions = {"tag": "urgent"}
    payload = {"tags": ["low-priority"]}
    assert automation_engine._evaluate_conditions(conditions, payload) is False


@pytest.mark.asyncio
async def test_evaluate_empty_conditions():
    assert automation_engine._evaluate_conditions({}, {"any": "data"}) is True
