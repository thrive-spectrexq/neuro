import logging
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.model_registry import ModelProvider, ModelType, RegisteredModel

logger = logging.getLogger("neuro.models")


class ModelRegistry:
    """Central registry for all AI models available in the workspace."""

    async def register_model(
        self,
        session: AsyncSession,
        user_id: uuid.UUID,
        name: str,
        provider: ModelProvider,
        model_type: ModelType,
        capabilities: list[str] | None = None,
        config: dict[str, Any] | None = None,
        is_local: bool = False,
        is_default: bool = False,
        requires_consent: bool = False,
    ) -> RegisteredModel:
        # If setting as default, unset any existing default for this type
        if is_default:
            await self._unset_defaults(session, user_id, model_type)

        # Cloud models require consent by default
        if not is_local and provider not in (ModelProvider.local, ModelProvider.ollama):
            requires_consent = True

        model = RegisteredModel(
            name=name,
            provider=provider,
            model_type=model_type,
            capabilities=capabilities or [],
            config=config or {},
            is_local=is_local,
            is_default=is_default,
            requires_consent=requires_consent,
            user_id=user_id,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        session.add(model)
        await session.commit()
        await session.refresh(model)
        logger.info(f"Model registered: name={name} provider={provider} type={model_type}")
        return model

    async def list_models(
        self,
        session: AsyncSession,
        user_id: uuid.UUID,
        model_type: ModelType | None = None,
        provider: ModelProvider | None = None,
    ) -> list[RegisteredModel]:
        stmt = select(RegisteredModel).where(RegisteredModel.user_id == user_id)
        if model_type:
            stmt = stmt.where(RegisteredModel.model_type == model_type)
        if provider:
            stmt = stmt.where(RegisteredModel.provider == provider)
        stmt = stmt.order_by(RegisteredModel.is_default.desc(), RegisteredModel.name)
        result = await session.execute(stmt)
        return list(result.scalars().all())

    async def get_model(
        self,
        session: AsyncSession,
        model_id: uuid.UUID,
    ) -> RegisteredModel | None:
        stmt = select(RegisteredModel).where(RegisteredModel.id == model_id)
        result = await session.execute(stmt)
        return result.scalars().first()

    async def get_default_model(
        self,
        session: AsyncSession,
        user_id: uuid.UUID,
        model_type: ModelType,
    ) -> RegisteredModel | None:
        stmt = select(RegisteredModel).where(
            RegisteredModel.user_id == user_id,
            RegisteredModel.model_type == model_type,
            RegisteredModel.is_default,
        )
        result = await session.execute(stmt)
        model = result.scalars().first()
        if not model:
            # Fall back to any model of this type
            stmt = (
                select(RegisteredModel)
                .where(
                    RegisteredModel.user_id == user_id,
                    RegisteredModel.model_type == model_type,
                )
                .limit(1)
            )
            result = await session.execute(stmt)
            model = result.scalars().first()
        return model

    async def update_model(
        self,
        session: AsyncSession,
        model_id: uuid.UUID,
        updates: dict[str, Any],
    ) -> RegisteredModel | None:
        model = await self.get_model(session, model_id)
        if not model:
            return None

        if updates.get("is_default") is True:
            await self._unset_defaults(session, model.user_id, model.model_type)

        for key, value in updates.items():
            if value is not None and hasattr(model, key):
                setattr(model, key, value)
        model.updated_at = datetime.now(UTC)
        session.add(model)
        await session.commit()
        await session.refresh(model)
        return model

    async def delete_model(
        self,
        session: AsyncSession,
        model_id: uuid.UUID,
    ) -> bool:
        model = await self.get_model(session, model_id)
        if not model:
            return False
        await session.delete(model)
        await session.commit()
        return True

    async def discover_local_models(
        self,
        session: AsyncSession,
        user_id: uuid.UUID,
    ) -> list[dict[str, Any]]:
        """Auto-discover models from local Ollama instance."""
        discovered = []
        try:
            import httpx

            from app.core.config import get_settings

            settings = get_settings()
            ollama_url = settings.OLLAMA_BASE_URL or "http://localhost:11434"
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"{ollama_url}/api/tags")
                if resp.status_code == 200:
                    data = resp.json()
                    for model_info in data.get("models", []):
                        model_name = model_info.get("name", "")
                        discovered.append(
                            {
                                "name": model_name,
                                "provider": "ollama",
                                "model_type": "chat",
                                "is_local": True,
                                "size": model_info.get("size"),
                                "modified_at": model_info.get("modified_at"),
                            }
                        )
        except Exception as e:
            logger.warning(f"Ollama discovery failed: {e}")
        return discovered

    async def _unset_defaults(
        self,
        session: AsyncSession,
        user_id: uuid.UUID,
        model_type: ModelType,
    ) -> None:
        stmt = select(RegisteredModel).where(
            RegisteredModel.user_id == user_id,
            RegisteredModel.model_type == model_type,
            RegisteredModel.is_default,
        )
        result = await session.execute(stmt)
        for model in result.scalars().all():
            model.is_default = False
            session.add(model)
        await session.flush()


model_registry = ModelRegistry()
