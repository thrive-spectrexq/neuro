import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_register_user(test_client: AsyncClient):
    response = await test_client.post(
        "/api/v1/auth/register",
        json={
            "email": "newuser@example.com",
            "username": "newuser",
            "password": "newpassword"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert data["username"] == "newuser"
    assert "id" in data

@pytest.mark.asyncio
async def test_register_duplicate_email(test_client: AsyncClient):
    # Register first
    await test_client.post(
        "/api/v1/auth/register",
        json={
            "email": "dupuser@example.com",
            "username": "dupuser",
            "password": "password"
        }
    )
    # Register again with same username (auth.py checks username)
    response = await test_client.post(
        "/api/v1/auth/register",
        json={
            "email": "dupuser2@example.com",
            "username": "dupuser",
            "password": "password"
        }
    )
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"].lower()

@pytest.mark.asyncio
async def test_login_success(test_client: AsyncClient, test_user):
    # test_user has username="testuser", password="testpassword"
    response = await test_client.post(
        "/api/v1/auth/login",
        data={
            "username": "testuser",
            "password": "testpassword"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_login_wrong_password(test_client: AsyncClient, test_user):
    response = await test_client.post(
        "/api/v1/auth/login",
        data={
            "username": "testuser",
            "password": "wrongpassword"
        }
    )
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_access_protected_endpoint_without_token(test_client: AsyncClient):
    # Using notes endpoint which is protected
    response = await test_client.get("/api/v1/notes")
    assert response.status_code == 401
