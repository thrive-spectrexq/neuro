import pytest
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI

from app.core.middleware import RequestIDMiddleware, RequestTimingMiddleware

@pytest.fixture
def test_app():
    app = FastAPI()
    app.add_middleware(RequestTimingMiddleware)
    app.add_middleware(RequestIDMiddleware)
    
    @app.get("/test")
    async def test_route():
        return {"status": "ok"}
        
    return app

@pytest.mark.asyncio
async def test_request_id_middleware(test_app):
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/test")
        
        assert "x-request-id" in response.headers
        assert len(response.headers["x-request-id"]) > 0

@pytest.mark.asyncio
async def test_request_timing_middleware(test_app):
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/test")
        
        assert "x-process-time" in response.headers
        assert float(response.headers["x-process-time"]) >= 0
