from __future__ import annotations

import io
import logging
import re
import zipfile
from datetime import datetime, timezone
from typing import Any
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

YAML_FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
WIKILINK_RE = re.compile(r"\[\[(.*?)\]\]")
TAG_RE = re.compile(r"(?:^|\s)#([a-zA-Z0-9_\-/]+)")


class ObsidianExportFile(BaseModel):
    path: str
    content: str


class ObsidianExportPackage(BaseModel):
    exported_at: str
    vault_name: str
    file_count: int
    files: list[ObsidianExportFile]


class ObsidianImportItem(BaseModel):
    filename: str
    content: str
    folder: str = ""


class ObsidianService:
    @staticmethod
    def sanitize_filename(name: str) -> str:
        """Sanitizes a string to be a safe filesystem and Obsidian note title."""
        sanitized = re.sub(r'[\\/:*?"<>|]+', "-", name)
        sanitized = re.sub(r"\s+", " ", sanitized).strip()
        return sanitized or "Untitled"

    @staticmethod
    def extract_wikilinks(content: str) -> list[str]:
        """Extracts all [[WikiLink]] targets from a markdown string."""
        return WIKILINK_RE.findall(content)

    @staticmethod
    def parse_markdown_note(filename: str, raw_content: str) -> dict[str, Any]:
        """Alias for parse_obsidian_markdown accepting (filename, raw_content) or (raw_content, filename)."""
        return ObsidianService.parse_obsidian_markdown(raw_content=raw_content, filename=filename)



    @staticmethod
    def export_vault(
        notes: list[Any],
        links: list[Any] | None = None,
        tags_by_note_id: dict[str, list[str]] | None = None,
        vault_name: str = "Neuro-Second-Brain",
    ) -> ObsidianExportPackage:
        """
        Exports the Second Brain knowledge base into an Obsidian-ready vault package.
        """
        def _get(obj: Any, key: str, default: Any = "") -> Any:
            if isinstance(obj, dict):
                return obj.get(key, default)
            return getattr(obj, key, default)

        tags_map = tags_by_note_id or {}
        note_id_to_title = {str(_get(n, "id")): _get(n, "title") or "Untitled Note" for n in notes}
        title_to_note_id = {(_get(n, "title") or "").strip().lower(): str(_get(n, "id")) for n in notes}

        # Build backlinks dictionary: note_id -> list of source note titles
        backlinks: dict[str, list[str]] = {str(_get(n, "id")): [] for n in notes}
        if links:
            for link in links:
                src_id = str(_get(link, "source_id", _get(link, "source", "")))
                tgt_id = str(_get(link, "target_id", _get(link, "target", "")))
                if tgt_id in backlinks and src_id in note_id_to_title:
                    src_title = note_id_to_title[src_id]
                    if src_title not in backlinks[tgt_id]:
                        backlinks[tgt_id].append(src_title)

        # Also extract inline [[wikilinks]] directly from note contents
        for note in notes:
            src_id = str(_get(note, "id"))
            src_title = _get(note, "title") or "Untitled Note"
            content = _get(note, "content") or ""
            parsed_links = ObsidianService.extract_wikilinks(content)
            for target_title in parsed_links:
                target_key = target_title.strip().lower()
                if target_key in title_to_note_id:
                    target_id = title_to_note_id[target_key]
                    if target_id != src_id and src_title not in backlinks[target_id]:
                        backlinks[target_id].append(src_title)

        files: list[ObsidianExportFile] = []


        # 1. Generate Index / Dashboard
        index_content = [
            f"# {vault_name}",
            "",
            "> 🧠 Exported from **Neuro Voice Agent & Second Brain**.",
            f"> Synchronized at: `{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%SZ')}`",
            "",
            "## Knowledge Graph Summary",
            f"- **Total Notes**: {len(notes)}",
            f"- **Total Inter-Note Links**: {len(links) if links else 0}",
            "",
            "## Table of Contents",
        ]

        for note in sorted(notes, key=lambda n: (_get(n, "title") or "").lower()):
            note_title = _get(note, "title") or "Untitled Note"
            clean_title = ObsidianService.sanitize_filename(note_title)
            index_content.append(f"- [[{clean_title}]]")

        files.append(
            ObsidianExportFile(
                path="_Map_Overview.md",
                content="\n".join(index_content) + "\n",
            )
        )

        # 2. Generate each note file
        for note in notes:
            n_id = str(_get(note, "id"))
            title = _get(note, "title") or "Untitled Note"
            safe_title = ObsidianService.sanitize_filename(title)
            note_tags = tags_map.get(n_id, [])
            if not note_tags and isinstance(note, dict) and "tags" in note:
                note_tags = note.get("tags") or []
            note_backlinks = backlinks.get(n_id, [])

            created_val = _get(note, "created_at")
            if hasattr(created_val, "isoformat"):
                created_iso = created_val.isoformat()
            elif isinstance(created_val, str) and created_val:
                created_iso = created_val
            else:
                created_iso = datetime.now(timezone.utc).isoformat()

            updated_val = _get(note, "updated_at")
            if hasattr(updated_val, "isoformat"):
                updated_iso = updated_val.isoformat()
            elif isinstance(updated_val, str) and updated_val:
                updated_iso = updated_val
            else:
                updated_iso = created_iso

            # Format YAML frontmatter
            escaped_title = title.replace('"', '\\"')
            frontmatter_lines = [
                "---",
                f'id: "{n_id}"',
                f'title: "{escaped_title}"',
            ]
            if note_tags:
                formatted_tags = ", ".join(f'"{t.replace("#", "")}"' for t in note_tags)
                frontmatter_lines.append(f"tags: [{formatted_tags}]")
            else:
                frontmatter_lines.append("tags: [neuro, second-brain]")

            frontmatter_lines.extend([
                f'created: "{created_iso}"',
                f'updated: "{updated_iso}"',
                "---",
                "",
            ])

            content_val = _get(note, "content") or "*No content*"
            body_lines = [
                f"# {title}",
                "",
                content_val,
                "",
            ]

            # Append backlinks if available
            if note_backlinks:
                body_lines.extend([
                    "---",
                    "## Linked Mentions",
                    "",
                ])
                for bl in sorted(note_backlinks):
                    body_lines.append(f"- [[{bl}]]")
                body_lines.append("")

            files.append(
                ObsidianExportFile(
                    path=f"{safe_title}.md",
                    content="\n".join(frontmatter_lines) + "\n".join(body_lines),
                )
            )

        return ObsidianExportPackage(
            exported_at=datetime.now(timezone.utc).isoformat(),
            vault_name=vault_name,
            file_count=len(files),
            files=files,
        )

    @staticmethod
    def create_vault_zip(package: ObsidianExportPackage) -> bytes:
        """Packages an ObsidianExportPackage into a downloadable ZIP archive."""
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            for file in package.files:
                zf.writestr(file.path, file.content.encode("utf-8"))
        return zip_buffer.getvalue()

    @staticmethod
    def parse_obsidian_markdown(raw_content: str, filename: str = "") -> dict[str, Any]:
        """
        Parses an Obsidian markdown document, extracting YAML frontmatter, [[wikilinks]], #tags, and body.
        """
        frontmatter: dict[str, Any] = {}
        body = raw_content

        fm_match = YAML_FRONTMATTER_RE.match(raw_content)
        if fm_match:
            fm_text = fm_match.group(1)
            body = raw_content[fm_match.end():]
            current_key = None
            for line in fm_text.split("\n"):
                stripped = line.strip()
                if not stripped:
                    continue
                if stripped.startswith("- ") and current_key:
                    item_val = stripped[2:].strip().strip('"\'')
                    if current_key not in frontmatter or not isinstance(frontmatter[current_key], list):
                        frontmatter[current_key] = []
                    frontmatter[current_key].append(item_val)
                elif ":" in line:
                    key, val = line.split(":", 1)
                    key = key.strip()
                    val = val.strip().strip('"\'')
                    current_key = key
                    if val.startswith("[") and val.endswith("]"):
                        items = [x.strip().strip('"\'') for x in val[1:-1].split(",") if x.strip()]
                        frontmatter[key] = items
                    elif val:
                        frontmatter[key] = val
                    else:
                        frontmatter[key] = []


        # Extract title
        title = frontmatter.get("title")
        if not title:
            # Check first H1
            h1_match = re.search(r"^#\s+(.+)$", body, re.MULTILINE)
            if h1_match:
                title = h1_match.group(1).strip()
            else:
                title = filename.replace(".md", "").strip() or "Imported Note"

        # Extract [[wikilinks]]
        wikilinks = WIKILINK_RE.findall(body)

        # Extract tags from body and frontmatter
        body_tags = TAG_RE.findall(body)
        fm_tags = frontmatter.get("tags", [])
        if isinstance(fm_tags, str):
            fm_tags = [fm_tags]

        all_tags = list(set(fm_tags + body_tags))

        return {
            "title": title,
            "content": body.strip(),
            "frontmatter": frontmatter,
            "wikilinks": wikilinks,
            "tags": all_tags,
        }
