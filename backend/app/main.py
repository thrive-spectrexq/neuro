from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import text

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.database import create_db_and_tables, engine
from app.core.deps import get_current_active_user
from app.core.exceptions import NeuroException, neuro_exception_handler
from app.core.logging import setup_logging
from app.core.metrics import MetricsMiddleware
from app.core.middleware import RequestIDMiddleware, RequestTimingMiddleware
from app.core.sentry import init_sentry
from app.models.user import User

try:
    from prometheus_client import make_asgi_app

    PROMETHEUS_AVAILABLE = True
except ImportError:
    PROMETHEUS_AVAILABLE = False


settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()

    try:
        dsn = getattr(settings, "SENTRY_DSN", None)
        init_sentry(dsn=dsn, environment=settings.NEURO_ENV)
    except Exception:
        pass

    await create_db_and_tables()
    yield


app = FastAPI(
    title="Neuro API",
    version="0.1.3",
    lifespan=lifespan,
)


cors_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
if "*" in cors_origins:
    cors_origins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "app://.",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(MetricsMiddleware)
app.add_middleware(RequestTimingMiddleware)
app.add_middleware(RequestIDMiddleware)

app.add_exception_handler(NeuroException, neuro_exception_handler)

app.include_router(api_router, prefix="/api/v1")


@app.get("/api/v1/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_active_user)):
    return current_user


@app.get("/health")
async def health_check():
    return {"status": "ok", "env": settings.NEURO_ENV, "version": app.version}


@app.get("/health/live")
async def health_live():
    return {"status": "ok"}


@app.get("/health/ready")
async def health_ready():
    status = {"db": "ok", "redis": "ok", "chroma": "ok"}

    try:
        from sqlalchemy.ext.asyncio import AsyncSession

        async with AsyncSession(engine) as session:
            await session.execute(text("SELECT 1"))
    except Exception as e:
        status["db"] = f"error: {str(e)}"

    try:
        import redis.asyncio as aioredis

        client = aioredis.from_url(settings.REDIS_URL)
        await client.ping()
        await client.aclose()
    except Exception as e:
        status["redis"] = f"error: {str(e)}"

    try:
        import chromadb

        client = chromadb.HttpClient(host=settings.CHROMA_HOST, port=settings.CHROMA_PORT)
        client.heartbeat()
    except Exception as e:
        status["chroma"] = f"error: {str(e)}"

    is_ready = all(v == "ok" for v in status.values())
    if not is_ready:
        import json

        from fastapi import Response

        return Response(content=json.dumps(status), status_code=503, media_type="application/json")

    return status


if PROMETHEUS_AVAILABLE:
    metrics_app = make_asgi_app()
    app.mount("/metrics", metrics_app)
