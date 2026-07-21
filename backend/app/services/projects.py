from typing import List
from uuid import UUID
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from fastapi import HTTPException

from app.models.project import Project, ProjectMember, Role
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.models.audit import AuditLog

class ProjectService:
    @staticmethod
    async def create_project(session: AsyncSession, user_id: UUID, data: ProjectCreate) -> Project:
        project = Project(**data.model_dump(), owner_id=user_id)
        session.add(project)
        await session.flush()
        
        member = ProjectMember(project_id=project.id, user_id=user_id, role=Role.OWNER)
        session.add(member)
        
        audit = AuditLog(
            user_id=user_id,
            project_id=project.id,
            action="CREATE_PROJECT",
            target_type="project",
            target_id=str(project.id),
            details={"name": project.name} if hasattr(project, "name") else {}
        )
        session.add(audit)
        
        await session.commit()
        await session.refresh(project)
        return project

    @staticmethod
    async def get_project(session: AsyncSession, project_id: UUID, user_id: UUID) -> Project:
        member_stmt = select(ProjectMember).where(
            ProjectMember.project_id == project_id, 
            ProjectMember.user_id == user_id
        )
        member_res = await session.execute(member_stmt)
        if not member_res.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Not authorized to access this project")
            
        stmt = select(Project).where(Project.id == project_id)
        res = await session.execute(stmt)
        project = res.scalar_one_or_none()
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
            
        return project

    @staticmethod
    async def list_projects(session: AsyncSession, user_id: UUID) -> List[Project]:
        stmt = select(Project).join(ProjectMember).where(ProjectMember.user_id == user_id)
        res = await session.execute(stmt)
        return list(res.scalars().all())

    @staticmethod
    async def update_project(session: AsyncSession, project_id: UUID, user_id: UUID, data: ProjectUpdate) -> Project:
        project = await ProjectService.get_project(session, project_id, user_id)
        
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(project, key, value)
            
        audit = AuditLog(
            user_id=user_id,
            project_id=project.id,
            action="UPDATE_PROJECT",
            target_type="project",
            target_id=str(project.id),
            details={"updated_fields": list(update_data.keys())}
        )
        session.add(audit)
            
        session.add(project)
        await session.commit()
        await session.refresh(project)
        return project

    @staticmethod
    async def delete_project(session: AsyncSession, project_id: UUID, user_id: UUID) -> None:
        member_stmt = select(ProjectMember).where(
            ProjectMember.project_id == project_id, 
            ProjectMember.user_id == user_id,
            ProjectMember.role == Role.OWNER
        )
        member_res = await session.execute(member_stmt)
        if not member_res.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Only owners can delete projects")
            
        stmt = select(Project).where(Project.id == project_id)
        res = await session.execute(stmt)
        project = res.scalar_one_or_none()
        if project:
            audit = AuditLog(
                user_id=user_id,
                project_id=project.id,
                action="DELETE_PROJECT",
                target_type="project",
                target_id=str(project.id),
                details={}
            )
            session.add(audit)
            
            await session.delete(project)
            await session.commit()

    @staticmethod
    async def add_member(session: AsyncSession, project_id: UUID, user_id: UUID, member_user_id: UUID, role: Role) -> ProjectMember:
        admin_stmt = select(ProjectMember).where(
            ProjectMember.project_id == project_id, 
            ProjectMember.user_id == user_id,
            ProjectMember.role.in_([Role.OWNER, Role.ADMIN])
        )
        admin_res = await session.execute(admin_stmt)
        if not admin_res.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Not authorized to add members")
            
        member_stmt = select(ProjectMember).where(
            ProjectMember.project_id == project_id, 
            ProjectMember.user_id == member_user_id
        )
        member_res = await session.execute(member_stmt)
        existing = member_res.scalar_one_or_none()
        
        audit_action = "UPDATE_PROJECT_MEMBER" if existing else "ADD_PROJECT_MEMBER"
        
        if existing:
            existing.role = role
            member = existing
        else:
            member = ProjectMember(project_id=project_id, user_id=member_user_id, role=role)
            
        session.add(member)
        
        audit = AuditLog(
            user_id=user_id,
            project_id=project_id,
            action=audit_action,
            target_type="project_member",
            target_id=str(member_user_id),
            details={"role": role}
        )
        session.add(audit)
        
        await session.commit()
        await session.refresh(member)
        return member

    @staticmethod
    async def remove_member(session: AsyncSession, project_id: UUID, user_id: UUID, member_user_id: UUID) -> None:
        if user_id != member_user_id:
            admin_stmt = select(ProjectMember).where(
                ProjectMember.project_id == project_id, 
                ProjectMember.user_id == user_id,
                ProjectMember.role.in_([Role.OWNER, Role.ADMIN])
            )
            admin_res = await session.execute(admin_stmt)
            if not admin_res.scalar_one_or_none():
                raise HTTPException(status_code=403, detail="Not authorized to remove members")
                
        member_stmt = select(ProjectMember).where(
            ProjectMember.project_id == project_id, 
            ProjectMember.user_id == member_user_id
        )
        member_res = await session.execute(member_stmt)
        member = member_res.scalar_one_or_none()
        if member:
            audit = AuditLog(
                user_id=user_id,
                project_id=project_id,
                action="REMOVE_PROJECT_MEMBER",
                target_type="project_member",
                target_id=str(member_user_id),
                details={}
            )
            session.add(audit)
            
            await session.delete(member)
            await session.commit()

    @staticmethod
    async def list_members(session: AsyncSession, project_id: UUID) -> List[ProjectMember]:
        stmt = select(ProjectMember).where(ProjectMember.project_id == project_id)
        res = await session.execute(stmt)
        return list(res.scalars().all())

project_service = ProjectService()
