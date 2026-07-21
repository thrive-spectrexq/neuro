import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_tag(test_client: AsyncClient, auth_headers: dict[str, str]):
    response = await test_client.post(
        "/api/v1/tags",
        json={"name": "New Tag", "color": "#ff0000"},
        headers=auth_headers
    )
    assert response.status_code in (200, 201)
    data = response.json()
    assert data["name"] == "new tag"
    assert "id" in data

@pytest.mark.asyncio
async def test_list_tags(test_client: AsyncClient, auth_headers: dict[str, str]):
    await test_client.post(
        "/api/v1/tags",
        json={"name": "List Tag"},
        headers=auth_headers
    )
    response = await test_client.get("/api/v1/tags", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    tag_names = [t["name"] for t in data]
    assert "list tag" in tag_names

@pytest.mark.asyncio
async def test_delete_tag(test_client: AsyncClient, auth_headers: dict[str, str]):
    create_resp = await test_client.post(
        "/api/v1/tags",
        json={"name": "Delete Tag"},
        headers=auth_headers
    )
    tag_id = create_resp.json()["id"]

    del_resp = await test_client.delete(f"/api/v1/tags/{tag_id}", headers=auth_headers)
    assert del_resp.status_code == 204

    # Try listing to verify it's gone
    list_resp = await test_client.get("/api/v1/tags", headers=auth_headers)
    tag_ids = [t["id"] for t in list_resp.json()]
    assert tag_id not in tag_ids
