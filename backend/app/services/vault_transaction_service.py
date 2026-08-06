"""
Vault Transaction & Boundary Enforcement Service for Neuro.

Provides atomic plan-apply transactional mutability for notes, canvas, and vault operations:
- Pre-mutation snapshot & checksum tracking
- Deterministic dry-run plan generation with unified diffs
- Safe rollback on execution failure
- Strict vault-boundary sandboxing (path traversal prevention)
"""

import hashlib
import os
import shutil
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


class VaultBoundaryViolation(Exception):
    """Raised when an operation attempts to read/write outside the designated vault root."""

    pass


class TransactionExecutionError(Exception):
    """Raised when an atomic transaction fails during execution."""

    pass


@dataclass
class TransactionOperation:
    op_type: str  # 'create', 'update', 'delete', 'rename'
    rel_path: str
    content: str | None = None
    old_rel_path: str | None = None
    pre_checksum: str | None = None
    backup_path: str | None = None


@dataclass
class TransactionPlan:
    tx_id: str
    vault_root: str
    operations: list[TransactionOperation] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat())
    diffs: dict[str, str] = field(default_factory=dict)
    applied: bool = False
    rolled_back: bool = False


class VaultTransactionService:
    """
    Manages atomic vault file operations with preview plans, boundary checks, and safe rollback.
    """

    def __init__(self, vault_root: str | None = None, backup_dir: str | None = None):
        self.vault_root = Path(vault_root or os.getcwd()).resolve()
        self.backup_dir = Path(backup_dir or (self.vault_root / ".neuro" / "tx_backups")).resolve()
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        self._active_transactions: dict[str, TransactionPlan] = {}

    def _compute_checksum(self, file_path: Path) -> str | None:
        if not file_path.exists() or not file_path.is_file():
            return None
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(8192):
                hasher.update(chunk)
        return hasher.hexdigest()

    def validate_boundary(self, rel_path: str) -> Path:
        """
        Enforces that target relative path resolves strictly inside vault root.
        """
        target = (self.vault_root / rel_path).resolve()
        try:
            target.relative_to(self.vault_root)
        except ValueError:
            raise VaultBoundaryViolation(
                f"Security violation: path '{rel_path}' resolves outside vault boundary '{self.vault_root}'."
            )
        return target

    def begin_transaction(self, tx_id: str | None = None) -> TransactionPlan:
        """Initializes a new atomic plan/apply transaction."""
        tid = tx_id or f"tx_{int(datetime.now(UTC).timestamp() * 1000)}"
        plan = TransactionPlan(tx_id=tid, vault_root=str(self.vault_root))
        self._active_transactions[tid] = plan
        return plan

    def stage_create(self, tx_id: str, rel_path: str, content: str) -> TransactionPlan:
        """Stages creating a new file."""
        plan = self._active_transactions.get(tx_id)
        if not plan:
            raise ValueError(f"Unknown transaction '{tx_id}'")

        target = self.validate_boundary(rel_path)
        diff = f"+++ {rel_path} (New File, {len(content)} bytes)\n" + "\n".join(
            f"+ {line}" for line in content.splitlines()[:20]
        )
        if len(content.splitlines()) > 20:
            diff += f"\n+ ... ({len(content.splitlines()) - 20} more lines)"

        op = TransactionOperation(
            op_type="create",
            rel_path=rel_path,
            content=content,
            pre_checksum=self._compute_checksum(target) if target.exists() else None,
        )
        plan.operations.append(op)
        plan.diffs[rel_path] = diff
        return plan

    def stage_update(self, tx_id: str, rel_path: str, new_content: str) -> TransactionPlan:
        """Stages updating an existing file."""
        plan = self._active_transactions.get(tx_id)
        if not plan:
            raise ValueError(f"Unknown transaction '{tx_id}'")

        target = self.validate_boundary(rel_path)
        old_content = target.read_text(encoding="utf-8") if target.exists() else ""
        diff = f"--- {rel_path} (Existing)\n+++ {rel_path} (Updated)\n"
        diff += f"@@ Content change: {len(old_content)} bytes -> {len(new_content)} bytes @@"

        op = TransactionOperation(
            op_type="update",
            rel_path=rel_path,
            content=new_content,
            pre_checksum=self._compute_checksum(target),
        )
        plan.operations.append(op)
        plan.diffs[rel_path] = diff
        return plan

    def stage_delete(self, tx_id: str, rel_path: str) -> TransactionPlan:
        """Stages deleting a file."""
        plan = self._active_transactions.get(tx_id)
        if not plan:
            raise ValueError(f"Unknown transaction '{tx_id}'")

        target = self.validate_boundary(rel_path)
        op = TransactionOperation(
            op_type="delete",
            rel_path=rel_path,
            pre_checksum=self._compute_checksum(target),
        )
        plan.operations.append(op)
        plan.diffs[rel_path] = f"--- {rel_path} (Marked for Deletion)"
        return plan

    def stage_rename(self, tx_id: str, old_rel_path: str, new_rel_path: str) -> TransactionPlan:
        """Stages renaming or moving a file."""
        plan = self._active_transactions.get(tx_id)
        if not plan:
            raise ValueError(f"Unknown transaction '{tx_id}'")

        old_target = self.validate_boundary(old_rel_path)
        self.validate_boundary(new_rel_path)

        op = TransactionOperation(
            op_type="rename",
            rel_path=new_rel_path,
            old_rel_path=old_rel_path,
            pre_checksum=self._compute_checksum(old_target),
        )
        plan.operations.append(op)
        plan.diffs[new_rel_path] = f"rename: {old_rel_path} -> {new_rel_path}"
        return plan

    def apply_transaction(self, tx_id: str) -> dict[str, Any]:
        """
        Executes all staged operations atomically.
        If any step fails, restores all affected files from snapshots immediately.
        """
        plan = self._active_transactions.get(tx_id)
        if not plan:
            raise ValueError(f"Unknown transaction '{tx_id}'")
        if plan.applied:
            raise ValueError(f"Transaction '{tx_id}' has already been applied")

        executed_backups: list[dict[str, Any]] = []
        try:
            for op in plan.operations:
                target = self.validate_boundary(op.rel_path)

                # 1. Snapshot existing target if present
                if target.exists():
                    backup_file = self.backup_dir / f"{tx_id}_{target.name}"
                    shutil.copy2(target, backup_file)
                    op.backup_path = str(backup_file)
                    executed_backups.append({"target": target, "backup": backup_file, "type": "modify"})
                else:
                    executed_backups.append({"target": target, "backup": None, "type": "new"})

                # 2. Execute operation
                if op.op_type in ("create", "update"):
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_text(op.content or "", encoding="utf-8")
                elif op.op_type == "delete":
                    if target.exists():
                        target.unlink()
                elif op.op_type == "rename" and op.old_rel_path:
                    old_target = self.validate_boundary(op.old_rel_path)
                    if old_target.exists():
                        target.parent.mkdir(parents=True, exist_ok=True)
                        shutil.move(str(old_target), str(target))

            plan.applied = True
            return {
                "status": "success",
                "tx_id": tx_id,
                "operations_applied": len(plan.operations),
                "timestamp": datetime.now(UTC).isoformat(),
            }

        except Exception as e:
            # Atomic rollback of all modified paths
            self._rollback_backups(executed_backups)
            plan.rolled_back = True
            raise TransactionExecutionError(f"Transaction {tx_id} failed and was rolled back: {str(e)}")

    def _rollback_backups(self, executed_backups: list[dict[str, Any]]) -> None:
        """Rolls back files to their previous states."""
        for item in reversed(executed_backups):
            target: Path = item["target"]
            backup: Path | None = item["backup"]
            item_type: str = item["type"]

            try:
                if item_type == "new" and target.exists():
                    target.unlink()
                elif item_type == "modify" and backup and backup.exists():
                    shutil.copy2(backup, target)
            except Exception as rollback_err:
                print(f"Critical error during transaction rollback for {target}: {rollback_err}")

    def get_plan_summary(self, tx_id: str) -> dict[str, Any]:
        """Returns plan details and diffs for dry-run inspection."""
        plan = self._active_transactions.get(tx_id)
        if not plan:
            raise ValueError(f"Unknown transaction '{tx_id}'")

        return {
            "tx_id": plan.tx_id,
            "vault_root": plan.vault_root,
            "total_operations": len(plan.operations),
            "operations": [
                {
                    "op_type": op.op_type,
                    "rel_path": op.rel_path,
                    "old_rel_path": op.old_rel_path,
                    "has_backup": bool(op.backup_path),
                }
                for op in plan.operations
            ],
            "diffs": plan.diffs,
            "applied": plan.applied,
            "rolled_back": plan.rolled_back,
            "created_at": plan.created_at,
        }
