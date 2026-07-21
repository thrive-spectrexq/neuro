import asyncio
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlmodel import SQLModel, select

from app.core.database import get_session
from app.core.security import create_access_token, get_password_hash
from app.main import app
from app.models.user import User

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False, future=True)


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        from sqlalchemy import text

        await conn.execute(
            text("CREATE VIRTUAL TABLE IF NOT EXISTS note_fts USING fts5(id UNINDEXED, title, content);")
        )
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)


@pytest_asyncio.fixture
async def test_session(setup_db) -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSession(test_engine) as session:
        yield session


@pytest_asyncio.fixture
async def test_user(test_session: AsyncSession) -> User:
    result = await test_session.execute(select(User).where(User.username == "testuser"))
    user = result.scalar_one_or_none()
    if not user:
        user = User(
            email="testuser@example.com",
            username="testuser",
            hashed_password=get_password_hash("testpassword"),
        )
        test_session.add(user)
        await test_session.commit()
        await test_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user: User) -> dict[str, str]:
    access_token = create_access_token(data={"sub": test_user.username})
    return {"Authorization": f"Bearer {access_token}"}


@pytest_asyncio.fixture
async def test_client(test_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_session():
        yield test_session

    app.dependency_overrides[get_session] = override_get_session

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()
