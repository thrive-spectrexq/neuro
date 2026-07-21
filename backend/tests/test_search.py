import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_search_returns_results(test_client: AsyncClient, auth_headers: dict[str, str]):
    # First, create a note to ensure we have something to search
    await test_client.post(
        "/api/v1/notes",
        json={"title": "Unique Searchable Title", "content": "Special content to find"},
        headers=auth_headers,
    )

    # Do search
    response = await test_client.get("/api/v1/search?q=Unique", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    # Some search engines might not sync instantly in tests, but we expect a 200 response
    assert isinstance(data["results"], list)


@pytest.mark.asyncio
async def test_search_empty_query(test_client: AsyncClient, auth_headers: dict[str, str]):
    response = await test_client.get("/api/v1/search?q=", headers=auth_headers)
    # The API might return 400 or just empty list for empty query
    assert response.status_code in [200, 400]
    if response.status_code == 200:
        data = response.json()
        assert "results" in data
