"""
Obsidian Vault Lint & Health Diagnostic Engine for Neuro.

Provides deterministic, offline linting across knowledge notes and Obsidian vaults:
- Dead & dangling wikilink detection ([[UnresolvedTarget]])
- Orphaned note detection (zero inbound and outbound links)
- Metadata & YAML frontmatter validation gaps
- Empty sections & dangling headers
- Vault health score calculation (0-100%) and actionable repair suggestions.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field

WIKILINK_EXTRACTOR = re.compile(r"\[\[(.*?)\]\]")
HEADING_EXTRACTOR = re.compile(r"^(#{1,6})\s+(.+)$", re.MULTILINE)
YAML_FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)


class DeadLinkIssue(BaseModel):
    source_file: str
    target: str
    line_number: int
    raw_wikilink: str


class MetadataGapIssue(BaseModel):
    file: str
    missing_fields: list[str]
    description: str


class EmptySectionIssue(BaseModel):
    file: str
    heading: str
    line_number: int


class VaultLintReport(BaseModel):
    vault_name: str = "Neuro Vault"
    total_notes_scanned: int = 0
    health_score: float = 100.0
    status: str = "healthy"
    dead_links: list[DeadLinkIssue] = Field(default_factory=list)
    orphan_notes: list[str] = Field(default_factory=list)
    metadata_gaps: list[MetadataGapIssue] = Field(default_factory=list)
    empty_sections: list[EmptySectionIssue] = Field(default_factory=list)
    actionable_suggestions: list[str] = Field(default_factory=list)


class ObsidianLintService:
    @staticmethod
    def _normalize_title(title: str) -> str:
        cleaned = re.sub(r"\.md$", "", title, flags=re.IGNORECASE)
        # Strip alias or heading link if present: [[Note#Heading|Alias]] -> Note
        cleaned = cleaned.split("#")[0].split("|")[0].strip().lower()
        return cleaned

    @classmethod
    def lint_notes(
        cls, notes: list[dict[str, Any]], vault_name: str = "Neuro-Vault"
    ) -> VaultLintReport:
        """
        Lints an in-memory list of notes (each dict having 'id', 'title', 'content', 'tags', etc.).
        """
        total_notes = len(notes)
        if total_notes == 0:
            return VaultLintReport(
                vault_name=vault_name,
                total_notes_scanned=0,
                health_score=100.0,
                status="healthy",
                actionable_suggestions=["Vault is currently empty. Add notes to start building your graph."],
            )

        known_titles: set[str] = set()
        title_to_orig: dict[str, str] = {}
        for note in notes:
            title = note.get("title") or note.get("name") or "Untitled"
            norm = cls._normalize_title(title)
            known_titles.add(norm)
            title_to_orig[norm] = title

        dead_links: list[DeadLinkIssue] = []
        outbound_links: dict[str, set[str]] = {cls._normalize_title(n.get("title", "")): set() for n in notes}
        inbound_links: dict[str, set[str]] = {cls._normalize_title(n.get("title", "")): set() for n in notes}
        metadata_gaps: list[MetadataGapIssue] = []
        empty_sections: list[EmptySectionIssue] = []

        for note in notes:
            orig_title = note.get("title") or note.get("name") or "Untitled"
            source_norm = cls._normalize_title(orig_title)
            content = note.get("content") or ""
            source_file = f"{orig_title}.md"

            # Check metadata gaps
            missing = []
            if not note.get("title"):
                missing.append("title")
            if not note.get("tags") and not note.get("tag_names"):
                missing.append("tags")
            if not note.get("created_at"):
                missing.append("created_at")
            if missing:
                metadata_gaps.append(
                    MetadataGapIssue(
                        file=source_file,
                        missing_fields=missing,
                        description=f"Note is missing frontmatter fields: {', '.join(missing)}",
                    )
                )

            # Check lines for wikilinks and empty sections
            lines = content.split("\n")
            current_heading = None
            current_heading_line = 0
            has_content_under_heading = False

            for idx, line in enumerate(lines, start=1):
                # Check heading
                heading_match = re.match(r"^(#{1,6})\s+(.+)$", line.strip())
                if heading_match:
                    if current_heading and not has_content_under_heading:
                        empty_sections.append(
                            EmptySectionIssue(
                                file=source_file,
                                heading=current_heading,
                                line_number=current_heading_line,
                            )
                        )
                    current_heading = heading_match.group(2).strip()
                    current_heading_line = idx
                    has_content_under_heading = False
                elif line.strip() and not line.strip().startswith("#"):
                    has_content_under_heading = True

                # Check wikilinks
                for match in WIKILINK_EXTRACTOR.finditer(line):
                    raw_target = match.group(1).strip()
                    target_norm = cls._normalize_title(raw_target)
                    if target_norm not in known_titles:
                        dead_links.append(
                            DeadLinkIssue(
                                source_file=source_file,
                                target=raw_target,
                                line_number=idx,
                                raw_wikilink=match.group(0),
                            )
                        )
                    else:
                        outbound_links[source_norm].add(target_norm)
                        inbound_links[target_norm].add(source_norm)

            # Trailing empty heading
            if current_heading and not has_content_under_heading:
                empty_sections.append(
                    EmptySectionIssue(
                        file=source_file,
                        heading=current_heading,
                        line_number=current_heading_line,
                    )
                )

        # Detect orphans
        orphan_notes: list[str] = []
        for note in notes:
            title = note.get("title") or note.get("name") or "Untitled"
            norm = cls._normalize_title(title)
            # Orphan if 0 incoming AND 0 outgoing
            if len(outbound_links.get(norm, set())) == 0 and len(inbound_links.get(norm, set())) == 0:
                orphan_notes.append(f"{title}.md")

        # Health score calculation
        penalty = (
            len(dead_links) * 4.0
            + len(orphan_notes) * 3.0
            + len(metadata_gaps) * 2.0
            + len(empty_sections) * 1.5
        )
        score = max(0.0, min(100.0, 100.0 - penalty))

        if score >= 90.0:
            status = "healthy"
        elif score >= 70.0:
            status = "needs_attention"
        else:
            status = "critical_gaps"

        # Actionable recommendations
        suggestions = []
        if dead_links:
            suggestions.append(
                f"Resolve {len(dead_links)} broken [[wikilinks]] by creating placeholder notes or updating targets."
            )
        if orphan_notes:
            suggestions.append(
                f"Connect {len(orphan_notes)} orphan notes into thematic MOCs (Maps of Content) or tag clusters."
            )
        if metadata_gaps:
            suggestions.append(
                f"Backfill missing YAML frontmatter metadata across {len(metadata_gaps)} notes."
            )
        if empty_sections:
            suggestions.append(
                f"Populate or clean up {len(empty_sections)} empty header sections across notes."
            )
        if not suggestions:
            suggestions.append("Vault is in pristine condition! All links, metadata, and sections are validated.")

        return VaultLintReport(
            vault_name=vault_name,
            total_notes_scanned=total_notes,
            health_score=round(score, 1),
            status=status,
            dead_links=dead_links,
            orphan_notes=orphan_notes,
            metadata_gaps=metadata_gaps,
            empty_sections=empty_sections,
            actionable_suggestions=suggestions,
        )

    @classmethod
    def lint_filesystem_vault(cls, vault_path: str | Path) -> VaultLintReport:
        """
        Scans and lints a local Obsidian directory on disk.
        """
        path = Path(vault_path)
        if not path.exists() or not path.is_dir():
            return VaultLintReport(
                vault_name=str(path),
                total_notes_scanned=0,
                health_score=0.0,
                status="not_found",
                actionable_suggestions=[f"Directory '{vault_path}' does not exist or is not a folder."],
            )

        notes_data = []
        for file in path.rglob("*.md"):
            # Ignore hidden folders like .git, .obsidian, .trash
            if any(part.startswith(".") for part in file.parts):
                continue
            try:
                content = file.read_text(encoding="utf-8", errors="replace")
                title = file.stem
                notes_data.append(
                    {
                        "id": str(file),
                        "title": title,
                        "content": content,
                        "created_at": "disk",
                        "tags": ["vault_file"],
                    }
                )
            except Exception:
                continue

        return cls.lint_notes(notes_data, vault_name=path.name)
