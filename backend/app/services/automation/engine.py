import logging

import httpx
from sqlalchemy.ext.asyncio.session import AsyncSession
from sqlmodel import select

from app.models.automation import AutomationRule

logger = logging.getLogger("neuro.automation")


class AutomationEngine:
    async def evaluate_triggers(self, db: AsyncSession, event_type: str, payload: dict):
        statement = select(AutomationRule).where(
            AutomationRule.trigger_type == event_type,
            AutomationRule.is_active.is_(True),
        )
        result = await db.execute(statement)
        rules = result.scalars().all()

        for rule in rules:
            if self._evaluate_conditions(rule.conditions, payload):
                await self.execute_workflow(rule, payload, db)

    def _evaluate_conditions(self, conditions: dict, payload: dict) -> bool:
        if not conditions:
            return True

        for key, expected_val in conditions.items():
            if key == "tag":
                tags = payload.get("tags", [])
                if expected_val not in tags:
                    return False
            else:
                if payload.get(key) != expected_val:
                    return False
        return True

    async def execute_workflow(self, rule: AutomationRule, context: dict, db: AsyncSession):
        for action in rule.actions:
            action_type = action.get("type")
            if action_type == "webhook":
                await self._execute_webhook(action, context)
            elif action_type == "auto_summarize":
                await self._execute_auto_summarize(action, context, db)
            elif action_type == "categorize":
                await self._execute_categorize(action, context, db)
            elif action_type == "extract_entities":
                await self._execute_extract_entities(action, context)
            elif action_type == "notify_webhook_with_summary":
                await self._execute_notify_webhook_with_summary(action, context, db)

    async def _execute_webhook(self, action: dict, context: dict):
        url = action.get("url")
        if url:
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(url, json=context, timeout=5.0)
                    response.raise_for_status()
            except Exception as e:
                logger.error(f"Webhook failed: {e}")

    async def _execute_auto_summarize(self, action: dict, context: dict, db: AsyncSession):
        logger.info(f"Executing auto summarize for context: {context}")
        note_id = context.get("note_id")
        if not note_id or not db:
            return

        from app.models.note import Note
        from app.services.ai.provider import get_ai_provider

        note = await db.get(Note, note_id)
        if not note:
            return

        ai_provider = get_ai_provider()
        prompt = f"Summarize the following text concisely:\n\n{note.content[:5000]}"
        summary = ""
        try:
            async for chunk in ai_provider.generate_response_stream(prompt, context=[]):
                summary += chunk
        except Exception as e:
            logger.error(f"Summarization failed: {e}")
            return

        note.content += f"\n\n## Summary\n{summary}"
        db.add(note)
        await db.commit()

    async def _execute_categorize(self, action: dict, context: dict, db: AsyncSession):
        logger.info(f"Executing categorize for context: {context}")
        note_id = context.get("note_id")
        if not note_id or not db:
            return

        from app.models.note import Note
        from app.models.tag import NoteTag, Tag
        from app.services.ai.provider import get_ai_provider

        note = await db.get(Note, note_id)
        if not note:
            return

        ai_provider = get_ai_provider()
        try:
            tags_extracted = await ai_provider.extract_tags(note.content[:5000])
        except Exception as e:
            logger.error(f"Categorization failed: {e}")
            return

        for tag_name in tags_extracted:
            statement = select(Tag).where(Tag.name == tag_name)
            result = await db.execute(statement)
            tag = result.scalars().first()
            if not tag:
                tag = Tag(name=tag_name, user_id=note.user_id)
                db.add(tag)
                await db.commit()
                await db.refresh(tag)

            note_tag = NoteTag(note_id=note.id, tag_id=tag.id)
            db.add(note_tag)
        await db.commit()

    async def _execute_notify_webhook_with_summary(self, action: dict, context: dict, db: AsyncSession):
        logger.info(f"Executing notify webhook with summary for context: {context}")
        note_id = context.get("note_id")
        if not note_id or not db:
            return

        from app.models.note import Note
        from app.services.ai.provider import get_ai_provider

        note = await db.get(Note, note_id)
        if not note:
            return

        ai_provider = get_ai_provider()
        prompt = f"Summarize the following text concisely:\n\n{note.content[:5000]}"
        summary = ""
        try:
            async for chunk in ai_provider.generate_response_stream(prompt, context=[]):
                summary += chunk
        except Exception as e:
            logger.error(f"Summarization failed: {e}")
            summary = "Summary generation failed."

        payload = {**context, "summary": summary}
        url = action.get("url")
        if url:
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(url, json=payload, timeout=5.0)
                    response.raise_for_status()
            except Exception as e:
                logger.error(f"Webhook failed: {e}")

    async def _execute_extract_entities(self, action: dict, context: dict):
        note_id = context.get("note_id")
        if note_id:
            from app.workers.tasks import extract_entities_task

            extract_entities_task.delay(note_id)


automation_engine = AutomationEngine()
