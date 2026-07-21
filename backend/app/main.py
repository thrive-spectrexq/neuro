from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.database import create_db_and_tables
from app.core.logging import setup_logging
from app.core.middleware import RequestTimingMiddleware, RequestIDMiddleware
from app.core.exceptions import NeuroException, neuro_exception_handler
from app.core.deps import get_current_active_user
from app.models.user import User
from fastapi import Depends

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    await create_db_and_tables()
    yield

app = FastAPI(
    title="Neuro API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestTimingMiddleware)
app.add_middleware(RequestIDMiddleware)

app.add_exception_handler(NeuroException, neuro_exception_handler)

app.include_router(api_router, prefix="/api/v1")

@app.get("/api/v1/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@app.get("/health")
async def health_check():
    return {"status": "ok", "env": settings.NEURO_ENV}
