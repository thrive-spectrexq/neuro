import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_task(test_client: AsyncClient, auth_headers: dict[str, str]):
    response = await test_client.post(
        "/api/v1/tasks",
        json={"title": "Test Task", "description": "Task desc", "status": "todo"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test Task"
    assert data["status"] == "todo"
    assert "id" in data


@pytest.mark.asyncio
async def test_list_tasks(test_client: AsyncClient, auth_headers: dict[str, str]):
    await test_client.post("/api/v1/tasks", json={"title": "List Task"}, headers=auth_headers)
    response = await test_client.get("/api/v1/tasks", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    # If the endpoint is paginated, check items, else check list
    if isinstance(data, dict) and "items" in data:
        assert len(data["items"]) > 0
    else:
        assert len(data) > 0


@pytest.mark.asyncio
async def test_update_task(test_client: AsyncClient, auth_headers: dict[str, str]):
    create_resp = await test_client.post("/api/v1/tasks", json={"title": "Old Task"}, headers=auth_headers)
    task_id = create_resp.json()["id"]

    update_resp = await test_client.put(f"/api/v1/tasks/{task_id}", json={"title": "New Task"}, headers=auth_headers)
    assert update_resp.status_code == 200
    assert update_resp.json()["title"] == "New Task"


@pytest.mark.asyncio
async def test_update_task_status(test_client: AsyncClient, auth_headers: dict[str, str]):
    create_resp = await test_client.post(
        "/api/v1/tasks",
        json={"title": "Status Task", "status": "todo"},
        headers=auth_headers,
    )
    task_id = create_resp.json()["id"]

    update_resp = await test_client.put(
        f"/api/v1/tasks/{task_id}", json={"status": "in_progress"}, headers=auth_headers
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["status"] == "in_progress"


@pytest.mark.asyncio
async def test_delete_task(test_client: AsyncClient, auth_headers: dict[str, str]):
    create_resp = await test_client.post("/api/v1/tasks", json={"title": "Delete Task"}, headers=auth_headers)
    task_id = create_resp.json()["id"]

    del_resp = await test_client.delete(f"/api/v1/tasks/{task_id}", headers=auth_headers)
    assert del_resp.status_code == 204

    get_resp = await test_client.get(f"/api/v1/tasks/{task_id}", headers=auth_headers)
    assert get_resp.status_code == 404
