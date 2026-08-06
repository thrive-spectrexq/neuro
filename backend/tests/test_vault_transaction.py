import pytest
import tempfile
import shutil
from pathlib import Path
from app.services.vault_transaction_service import (
    VaultTransactionService,
    VaultBoundaryViolation,
    TransactionExecutionError,
)


@pytest.fixture
def temp_vault():
    temp_dir = tempfile.mkdtemp()
    vault_path = Path(temp_dir) / "test_vault"
    vault_path.mkdir()
    yield vault_path
    shutil.rmtree(temp_dir, ignore_errors=True)


def test_boundary_validation_success_and_violation(temp_vault):
    service = VaultTransactionService(vault_root=str(temp_vault))

    # Valid relative paths inside vault
    valid_path = service.validate_boundary("Projects/Neuro/Note.md")
    assert valid_path == (temp_vault / "Projects" / "Neuro" / "Note.md").resolve()

    # Traversal attempt outside vault
    with pytest.raises(VaultBoundaryViolation):
        service.validate_boundary("../../etc/passwd")

    with pytest.raises(VaultBoundaryViolation):
        service.validate_boundary("../outside.txt")


def test_transaction_create_and_apply(temp_vault):
    service = VaultTransactionService(vault_root=str(temp_vault))
    plan = service.begin_transaction("tx_test_1")

    service.stage_create("tx_test_1", "Notes/Architecture.md", "# Architecture\n\n- Zero Knowledge")
    summary = service.get_plan_summary("tx_test_1")
    assert summary["total_operations"] == 1
    assert "Notes/Architecture.md" in summary["diffs"]

    # Execute
    res = service.apply_transaction("tx_test_1")
    assert res["status"] == "success"
    assert res["operations_applied"] == 1

    created_file = temp_vault / "Notes" / "Architecture.md"
    assert created_file.exists()
    assert "Zero Knowledge" in created_file.read_text(encoding="utf-8")


def test_transaction_update_and_delete(temp_vault):
    service = VaultTransactionService(vault_root=str(temp_vault))

    # Setup existing note
    note_path = temp_vault / "QuickNote.md"
    note_path.write_text("Initial text", encoding="utf-8")

    # Update note
    service.begin_transaction("tx_update")
    service.stage_update("tx_update", "QuickNote.md", "Updated content with [[WikiLink]]")
    service.apply_transaction("tx_update")
    assert note_path.read_text(encoding="utf-8") == "Updated content with [[WikiLink]]"

    # Delete note
    service.begin_transaction("tx_delete")
    service.stage_delete("tx_delete", "QuickNote.md")
    service.apply_transaction("tx_delete")
    assert not note_path.exists()


def test_transaction_rename(temp_vault):
    service = VaultTransactionService(vault_root=str(temp_vault))
    old_file = temp_vault / "OldName.md"
    old_file.write_text("Rename me", encoding="utf-8")

    service.begin_transaction("tx_rename")
    service.stage_rename("tx_rename", "OldName.md", "Archive/NewName.md")
    service.apply_transaction("tx_rename")

    assert not old_file.exists()
    new_file = temp_vault / "Archive" / "NewName.md"
    assert new_file.exists()
    assert new_file.read_text(encoding="utf-8") == "Rename me"


def test_transaction_rollback_on_failure(temp_vault):
    service = VaultTransactionService(vault_root=str(temp_vault))

    orig_file = temp_vault / "Important.md"
    orig_file.write_text("Critical Original Data", encoding="utf-8")

    plan = service.begin_transaction("tx_fail")
    service.stage_update("tx_fail", "Important.md", "Modified Data")

    # Inject simulated failure during multi-step operation
    # by staging an invalid target directory that cannot be created as a file
    (temp_vault / "conflict").mkdir()
    service.stage_create("tx_fail", "conflict", "This should fail because conflict is a directory")

    with pytest.raises(TransactionExecutionError):
        service.apply_transaction("tx_fail")

    # Verify rollback preserved original content
    assert orig_file.read_text(encoding="utf-8") == "Critical Original Data"
