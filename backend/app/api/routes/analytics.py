import csv
import io
import json
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.audit import AuditLog
from app.models.automation import AutomationRule
from app.models.comment import Comment
from app.models.note import Note
from app.models.project import Project
from app.models.tag import Tag
from app.models.task import Task
from app.models.user import User
from app.schemas.analytics import SystemStatsResponse, ActivityItemResponse
from app.services.audit import audit_service

router = APIRouter()


@router.get("/stats", response_model=SystemStatsResponse)
async def get_system_stats(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id if hasattr(current_user, 'id') else current_user.get("id")

    # Total counts
    notes_cnt = (await session.execute(select(func.count(Note.id)).where(Note.user_id == user_id, Note.is_archived == False))).scalar() or 0
    projects_cnt = (await session.execute(select(func.count(Project.id)).where(Project.user_id == user_id))).scalar() or 0
    tasks_cnt = (await session.execute(select(func.count(Task.id)))).scalar() or 0
    tags_cnt = (await session.execute(select(func.count(Tag.id)))).scalar() or 0
    auto_cnt = (await session.execute(select(func.count(AutomationRule.id)))).scalar() or 0
    comment_cnt = (await session.execute(select(func.count(Comment.id)))).scalar() or 0

    # Tasks by status
    tasks_res = await session.execute(select(Task.status, func.count(Task.id)).group_by(Task.status))
    tasks_by_status = {status_name: count for status_name, count in tasks_res.all()}

    # Notes by content type
    notes_res = await session.execute(select(Note.content_type, func.count(Note.id)).where(Note.user_id == user_id).group_by(Note.content_type))
    notes_by_type = {str(ctype): count for ctype, count in notes_res.all()}

    return SystemStatsResponse(
        total_notes=notes_cnt,
        total_projects=projects_cnt,
        total_tasks=tasks_cnt,
        total_tags=tags_cnt,
        total_automations=auto_cnt,
        total_comments=comment_cnt,
        tasks_by_status=tasks_by_status,
        notes_by_content_type=notes_by_type,
    )


@router.get("/activity", response_model=list[ActivityItemResponse])
async def get_recent_activity(
    limit: int = 20,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    stmt = select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit)
    res = await session.execute(stmt)
    logs = res.scalars().all()

    activity = []
    for log in logs:
        activity.append(
            ActivityItemResponse(
                id=str(log.id),
                action=log.action,
                entity_type=log.target_type,
                entity_id=str(log.target_id),
                details=log.details or {},
                timestamp=log.timestamp.isoformat(),
            )
        )
    return activity


@router.get("/audit/export")
async def export_audit_logs(
    format: str = Query("json", regex="^(json|csv)$"),
    project_id: uuid.UUID | None = Query(None),
    start_date: datetime | None = Query(None),
    end_date: datetime | None = Query(None),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id if hasattr(current_user, 'id') else uuid.UUID(current_user.get("id"))
    logs = await audit_service.export_audit_log(
        session, user_id=user_id, start_date=start_date, end_date=end_date, project_id=project_id
    )

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["id", "user_id", "project_id", "action", "target_type", "target_id", "timestamp", "details"])
        for log in logs:
            writer.writerow([
                str(log.id),
                str(log.user_id),
                str(log.project_id) if log.project_id else "",
                log.action,
                log.target_type,
                log.target_id,
                log.timestamp.isoformat(),
                json.dumps(log.details or {})
            ])
        csv_data = output.getvalue()
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=neuro_audit_export_{user_id}.csv"}
        )

    # JSON export
    json_data = [
        {
            "id": str(log.id),
            "user_id": str(log.user_id),
            "project_id": str(log.project_id) if log.project_id else None,
            "action": log.action,
            "target_type": log.target_type,
            "target_id": log.target_id,
            "details": log.details or {},
            "timestamp": log.timestamp.isoformat()
        }
        for log in logs
    ]
    return Response(
        content=json.dumps(json_data, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=neuro_audit_export_{user_id}.json"}
    )

