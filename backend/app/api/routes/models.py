import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.model_registry import ModelProvider, ModelType
from app.schemas.model_registry import (
    ModelCreate,
    ModelDiscoverResponse,
    ModelInvokeRequest,
    ModelInvokeResponse,
    ModelResponse,
    ModelUpdate,
    ModelUsageStats,
)
from app.services.models.registry import model_registry

router = APIRouter()


@router.get("", response_model=list[ModelResponse])
async def list_models(
    model_type: ModelType | None = Query(None),
    provider: ModelProvider | None = Query(None),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user, dict) else current_user.id
    models = await model_registry.list_models(
        session=session, user_id=user_id, model_type=model_type, provider=provider
    )
    return models


@router.post("", response_model=ModelResponse)
async def register_model(
    model_in: ModelCreate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user, dict) else current_user.id
    model = await model_registry.register_model(
        session=session,
        user_id=user_id,
        name=model_in.name,
        provider=ModelProvider(model_in.provider),
        model_type=ModelType(model_in.model_type),
        capabilities=model_in.capabilities,
        config=model_in.config,
        is_local=model_in.is_local,
        is_default=model_in.is_default,
        requires_consent=model_in.requires_consent,
    )
    return model


@router.post("/discover", response_model=ModelDiscoverResponse)
async def discover_models(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user, dict) else current_user.id
    discovered = await model_registry.discover_local_models(session, user_id)
    return ModelDiscoverResponse(discovered=discovered, provider="ollama")


@router.get("/{model_id}", response_model=ModelResponse)
async def get_model(
    model_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user, dict) else current_user.id
    model = await model_registry.get_model(session, model_id)
    if not model or model.user_id != user_id:
        raise HTTPException(status_code=404, detail="Model not found")
    return model


@router.put("/{model_id}", response_model=ModelResponse)
async def update_model(
    model_id: uuid.UUID,
    model_in: ModelUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user, dict) else current_user.id
    model = await model_registry.get_model(session, model_id)
    if not model or model.user_id != user_id:
        raise HTTPException(status_code=404, detail="Model not found")

    updates = model_in.model_dump(exclude_unset=True)
    updated_model = await model_registry.update_model(session, model_id, updates)
    return updated_model


@router.delete("/{model_id}", status_code=204, response_class=Response)
async def unregister_model(
    model_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user, dict) else current_user.id
    model = await model_registry.get_model(session, model_id)
    if not model or model.user_id != user_id:
        raise HTTPException(status_code=404, detail="Model not found")

    await model_registry.delete_model(session, model_id)


@router.post("/{model_id}/invoke", response_model=ModelInvokeResponse)
async def invoke_model(
    model_id: uuid.UUID,
    request_in: ModelInvokeRequest,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user, dict) else current_user.id
    model = await model_registry.get_model(session, model_id)
    if not model or model.user_id != user_id:
        raise HTTPException(status_code=404, detail="Model not found")

    return ModelInvokeResponse(
        model_id=model.id,
        model_name=model.name,
        provider=model.provider.value,
        output={"message": "Invoke placeholder"},
        tokens_used=0,
        latency_ms=0.0,
    )


@router.get("/{model_id}/usage", response_model=ModelUsageStats)
async def get_usage_stats(
    model_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user, dict) else current_user.id
    model = await model_registry.get_model(session, model_id)
    if not model or model.user_id != user_id:
        raise HTTPException(status_code=404, detail="Model not found")

    return ModelUsageStats(
        model_id=model.id, model_name=model.name, total_invocations=0, total_tokens=0, avg_latency_ms=0.0
    )
