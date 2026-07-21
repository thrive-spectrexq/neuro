import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.automation import AutomationRule
from app.models.user import User
from app.schemas.automation import (
    AutomationRuleCreate,
    AutomationRuleResponse,
    AutomationRuleUpdate,
    AutomationTestRequest,
    AutomationTestResponse,
)
from app.services.automation.engine import automation_engine

router = APIRouter()


@router.get("", response_model=list[AutomationRuleResponse])
async def list_automations(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.execute(select(AutomationRule).order_by(AutomationRule.created_at.desc()))
    rules = result.scalars().all()
    return rules


@router.post("", response_model=AutomationRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_automation(
    rule_in: AutomationRuleCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    rule = AutomationRule(
        name=rule_in.name,
        description=rule_in.description,
        trigger_type=rule_in.trigger_type,
        conditions=rule_in.conditions,
        actions=rule_in.actions,
        is_active=rule_in.is_active,
    )
    session.add(rule)
    await session.commit()
    await session.refresh(rule)
    return rule


@router.get("/{id}", response_model=AutomationRuleResponse)
async def get_automation(
    id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    rule = await session.get(AutomationRule, id)
    if not rule:
        raise HTTPException(status_code=404, detail="Automation rule not found")
    return rule


@router.put("/{id}", response_model=AutomationRuleResponse)
async def update_automation(
    id: uuid.UUID,
    rule_in: AutomationRuleUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    rule = await session.get(AutomationRule, id)
    if not rule:
        raise HTTPException(status_code=404, detail="Automation rule not found")

    update_data = rule_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(rule, field, value)

    rule.updated_at = datetime.now(UTC)
    session.add(rule)
    await session.commit()
    await session.refresh(rule)
    return rule


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_automation(
    id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    rule = await session.get(AutomationRule, id)
    if not rule:
        raise HTTPException(status_code=404, detail="Automation rule not found")

    await session.delete(rule)
    await session.commit()
    return None


@router.post("/{id}/toggle", response_model=AutomationRuleResponse)
async def toggle_automation(
    id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    rule = await session.get(AutomationRule, id)
    if not rule:
        raise HTTPException(status_code=404, detail="Automation rule not found")

    rule.is_active = not rule.is_active
    rule.updated_at = datetime.now(UTC)
    session.add(rule)
    await session.commit()
    await session.refresh(rule)
    return rule


@router.post("/test", response_model=AutomationTestResponse)
async def test_automation_rule(
    test_req: AutomationTestRequest,
    current_user: User = Depends(get_current_user),
):
    matched = automation_engine._evaluate_conditions(test_req.conditions, test_req.sample_payload)
    actions_to_sim = test_req.actions if matched else []
    msg = (
        f"Rule matched sample payload successfully with {len(actions_to_sim)} action(s) triggered."
        if matched
        else "Rule conditions did not match the provided sample payload."
    )
    return AutomationTestResponse(matched=matched, simulated_actions=actions_to_sim, message=msg)
