import uuid
import pytest
from app.models.project import Project, ProjectMember, Role
from app.models.note import Note
from app.api.routes.notes import _check_note_permission
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

@pytest.mark.asyncio
async def test_collaboration_permissions(mocker):
    mock_session = mocker.AsyncMock(spec=AsyncSession)
    owner_id = uuid.uuid4()
    viewer_id = uuid.uuid4()
    editor_id = uuid.uuid4()
    project_id = uuid.uuid4()
    
    # Mock project
    mock_project = Project(id=project_id, name="Test", user_id=owner_id)
    
    # Setup session.get side effect
    async def mock_get(model, pk):
        if model == Project:
            return mock_project if pk == project_id else None
        if model == ProjectMember:
            p_id, u_id = pk
            if u_id == viewer_id:
                return ProjectMember(project_id=p_id, user_id=u_id, role=Role.viewer)
            if u_id == editor_id:
                return ProjectMember(project_id=p_id, user_id=u_id, role=Role.editor)
        return None
        
    mock_session.get.side_effect = mock_get
    
    # Target note
    note = Note(id=uuid.uuid4(), title="Test", content="", user_id=owner_id, project_id=project_id)
    
    # Owner can read and write
    await _check_note_permission(mock_session, note, owner_id, require_edit=False)
    await _check_note_permission(mock_session, note, owner_id, require_edit=True)
    
    # Editor can read and write
    await _check_note_permission(mock_session, note, editor_id, require_edit=False)
    await _check_note_permission(mock_session, note, editor_id, require_edit=True)
    
    # Viewer can read but NOT write
    await _check_note_permission(mock_session, note, viewer_id, require_edit=False)
    
    with pytest.raises(HTTPException) as excinfo:
        await _check_note_permission(mock_session, note, viewer_id, require_edit=True)
        
    assert excinfo.value.status_code == 403
