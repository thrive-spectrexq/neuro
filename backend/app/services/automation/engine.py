import httpx
from sqlmodel import select
from sqlalchemy.ext.asyncio.session import AsyncSession
from app.models.automation import AutomationRule

class AutomationEngine:
    async def evaluate_triggers(self, db: AsyncSession, event_type: str, payload: dict):
        statement = select(AutomationRule).where(
            AutomationRule.trigger_type == event_type,
            AutomationRule.is_active == True
        )
        result = await db.exec(statement)
        rules = result.all()
        
        for rule in rules:
            if self._evaluate_conditions(rule.conditions, payload):
                await self.execute_workflow(rule, payload)
                
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

    async def execute_workflow(self, rule: AutomationRule, context: dict):
        for action in rule.actions:
            action_type = action.get("type")
            if action_type == "webhook":
                await self._execute_webhook(action, context)
            elif action_type == "auto_summarize":
                await self._execute_auto_summarize(action, context)
            elif action_type == "categorize":
                await self._execute_categorize(action, context)
            elif action_type == "extract_entities":
                await self._execute_extract_entities(action, context)
                
    async def _execute_webhook(self, action: dict, context: dict):
        url = action.get("url")
        if url:
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(url, json=context, timeout=5.0)
                    response.raise_for_status()
            except Exception as e:
                print(f"Webhook failed: {e}")

    async def _execute_auto_summarize(self, action: dict, context: dict):
        # Stub for auto summarize
        pass

    async def _execute_categorize(self, action: dict, context: dict):
        # Stub for categorization
        pass

    async def _execute_extract_entities(self, action: dict, context: dict):
        note_id = context.get("note_id")
        if note_id:
            from app.workers.tasks import extract_entities_task
            extract_entities_task.delay(note_id)

automation_engine = AutomationEngine()
