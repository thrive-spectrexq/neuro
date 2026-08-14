import os
from pathlib import Path
import pytest
from pydantic import ValidationError

from app.core.config import Settings
from app.core.exceptions import (
    ForbiddenException,
    GraphAnalysisException,
    NotFoundException,
    ObsidianLintError,
    PathTraversalError,
    RateLimitExceededException,
    RoadmapGenerationError,
    VaultIntegrityError,
)
from app.services.roadmap_service import RoadmapService
from app.services.vault_transaction_service import VaultBoundaryViolation, VaultTransactionService


def test_domain_exception_properties():
    nf = NotFoundException("Item not found", context={"item_id": "123"})
    assert nf.status_code == 404
    assert nf.detail == "Item not found"
    assert nf.context == {"item_id": "123"}

    pt = PathTraversalError()
    assert pt.status_code == 403

    rg = RoadmapGenerationError("Cycle detected")
    assert rg.status_code == 400

    ga = GraphAnalysisException("Extraction failed")
    assert ga.status_code == 422

    ol = ObsidianLintError("Broken frontmatter")
    assert ol.status_code == 422

    rl = RateLimitExceededException()
    assert rl.status_code == 429


def test_production_secret_key_validation():
    # In production, 'changeme' or < 32 chars must fail validation
    with pytest.raises(ValidationError):
        Settings(NEURO_ENV="production", NEURO_SECRET_KEY="changeme")

    with pytest.raises(ValidationError):
        Settings(NEURO_ENV="production", NEURO_SECRET_KEY="short_secret_key_under_32_chars")

    # In production with 32+ valid key, succeeds
    valid_prod = Settings(NEURO_ENV="production", NEURO_SECRET_KEY="a" * 32)
    assert valid_prod.NEURO_SECRET_KEY == "a" * 32


def test_vault_path_traversal_sandboxing(tmp_path):
    vault_root = tmp_path / "test_vault"
    vault_root.mkdir()
    svc = VaultTransactionService(vault_root=str(vault_root))

    # Resolving inside vault works
    safe_path = svc.validate_boundary("notes/note.md")
    assert safe_path.resolve().is_relative_to(vault_root.resolve())

    # Path traversal outside vault raises VaultBoundaryViolation (subclass of PathTraversalError)
    with pytest.raises(PathTraversalError):
        svc.validate_boundary("../../outside.md")

    with pytest.raises(VaultBoundaryViolation):
        svc.validate_boundary("../../../etc/passwd")


def test_roadmap_input_validation():
    # Empty goal raises RoadmapGenerationError
    with pytest.raises(RoadmapGenerationError):
        RoadmapService.generate_roadmap(goal="")

    # Too long goal raises RoadmapGenerationError
    with pytest.raises(RoadmapGenerationError):
        RoadmapService.generate_roadmap(goal="A" * 250)

    # Invalid depth raises RoadmapGenerationError
    with pytest.raises(RoadmapGenerationError):
        RoadmapService.generate_roadmap(goal="Rust", depth="expert_mode")
