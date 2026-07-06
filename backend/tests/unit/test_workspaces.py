import uuid
import pytest
from app.models.note import Note, NoteLink
from app.models.project import Project
from app.api.routes.notes import _update_note_links
from sqlalchemy.ext.asyncio import AsyncSession

@pytest.mark.asyncio
async def test_workspace_isolation_links(mocker):
    mock_session = mocker.AsyncMock(spec=AsyncSession)
    user_id = uuid.uuid4()
    project_1_id = uuid.uuid4()
    project_2_id = uuid.uuid4()
    
    source_note = Note(id=uuid.uuid4(), title="Source", content="Link to [[Target]]", user_id=user_id, project_id=project_1_id)
    target_note_p2 = Note(id=uuid.uuid4(), title="Target", content="", user_id=user_id, project_id=project_2_id)
    
    mock_result = mocker.MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_result
    
    await _update_note_links(mock_session, source_note)
    
    add_calls = mock_session.add.call_args_list
    created_notes = [call.args[0] for call in add_calls if isinstance(call.args[0], Note)]
    
    assert len(created_notes) == 1
    assert created_notes[0].title == "Target"
    assert created_notes[0].project_id == project_1_id
