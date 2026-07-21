import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.routes.notes import _get_note_links, _update_note_links
from app.models.note import Note, NoteLink


@pytest.mark.asyncio
async def test_update_and_get_note_links(mocker):
    # Mocking the session and its methods
    mock_session = mocker.AsyncMock(spec=AsyncSession)
    user_id = uuid.uuid4()

    source_note = Note(
        id=uuid.uuid4(),
        title="Source Note",
        content="Linking to [[Target Note]]",
        user_id=user_id,
    )
    target_note = Note(id=uuid.uuid4(), title="Target Note", content="", user_id=user_id)

    # Mock execute to return the target note when queried by title
    mock_result = mocker.MagicMock()
    mock_result.scalar_one_or_none.return_value = target_note
    mock_session.execute.return_value = mock_result

    # Run _update_note_links
    await _update_note_links(mock_session, source_note.id, source_note.content, user_id)

    # Ensure a link is added to the session
    add_calls = mock_session.add.call_args_list
    assert any(isinstance(call.args[0], NoteLink) for call in add_calls)

    # Now test fetching links
    # Mock return values for forward and backlinks
    mock_fwd_row = mocker.MagicMock()
    mock_fwd_row.id = target_note.id
    mock_fwd_row.title = target_note.title

    mock_fwd_result = mocker.MagicMock()
    mock_fwd_result.all.return_value = [mock_fwd_row]

    mock_bwd_result = mocker.MagicMock()
    mock_bwd_result.all.return_value = []

    mock_session.execute.side_effect = [mock_fwd_result, mock_bwd_result]

    fwd, bwd = await _get_note_links(mock_session, source_note.id)
    assert len(fwd) == 1
    assert fwd[0]["title"] == "Target Note"
    assert len(bwd) == 0
