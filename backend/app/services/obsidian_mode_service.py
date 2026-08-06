"""
Obsidian Filing Methodology & Note Routing Engine for Neuro.

Provides intelligent note routing and destination suggestions based on popular knowledge management paradigms:
- Generic: Type-based folders (sources, concepts, entities, sessions)
- LYT (Linking Your Thinking): Atomic notes with dedicated Maps of Content (MOCs)
- PARA: Projects, Areas, Resources, Archives categorized by actionability
- Zettelkasten: Atomic notes with timestamp-based unique identifiers and dense link scaffolds
"""

from __future__ import annotations

import re
from datetime import UTC, datetime

from pydantic import BaseModel, Field


class RouteSuggestion(BaseModel):
    mode: str
    suggested_filename: str
    suggested_folder: str
    suggested_rel_path: str
    suggested_tags: list[str] = Field(default_factory=list)
    moc_recommendation: str | None = None
    zettelkasten_uid: str | None = None
    reasoning: str


class ObsidianModeService:
    MODES = ["generic", "lyt", "para", "zettelkasten"]

    @staticmethod
    def _sanitize(name: str) -> str:
        cleaned = re.sub(r'[\\/:*?"<>|]+', "-", name).strip()
        cleaned = re.sub(r"\s+", " ", cleaned)
        return cleaned or "Untitled"

    @classmethod
    def route_note(
        cls,
        title: str,
        content: str = "",
        tags: list[str] | None = None,
        mode: str = "generic",
    ) -> RouteSuggestion:
        """
        Calculates the optimal destination folder, filename, and organization metadata
        according to the selected methodology.
        """
        mode = mode.lower().strip()
        if mode not in cls.MODES:
            mode = "generic"

        clean_title = cls._sanitize(title)
        tags_list = list(tags or [])
        content_lower = content.lower()
        title_lower = title.lower()

        now = datetime.now(UTC)
        zettelkasten_uid = now.strftime("%Y%m%d%H%M")

        if mode == "para":
            # PARA rules:
            # 1-Projects: Active tasks, goals, deadlines, 'project'
            # 2-Areas: Health, finance, career, habits, routine, 'area'
            # 3-Resources: Guides, references, algorithms, tools, docs, 'resource'
            # 4-Archives: Completed, old, historical, log, 'archive'
            if any(
                w in title_lower or w in content_lower for w in ["deadline", "milestone", "sprint", "project", "todo"]
            ):
                folder = "1-Projects"
                reason = "Contains active project indicators, milestones, or actionable deliverables."
                para_tag = "project"
            elif any(
                w in title_lower or w in content_lower
                for w in ["finance", "health", "habits", "routine", "personal", "admin"]
            ):
                folder = "2-Areas"
                reason = "Classified as an ongoing area of responsibility or personal system."
                para_tag = "area"
            elif any(
                w in title_lower or w in content_lower
                for w in ["completed", "archive", "legacy", "historical", "changelog"]
            ):
                folder = "4-Archives"
                reason = "Identified as an inactive or archived record."
                para_tag = "archive"
            else:
                folder = "3-Resources"
                reason = "Classified as a reference topic, knowledge resource, or ongoing subject."
                para_tag = "resource"

            filename = f"{clean_title}.md"
            if para_tag not in tags_list:
                tags_list.append(para_tag)

            return RouteSuggestion(
                mode="para",
                suggested_filename=filename,
                suggested_folder=folder,
                suggested_rel_path=f"{folder}/{filename}",
                suggested_tags=tags_list,
                reasoning=reason,
            )

        elif mode == "lyt":
            # LYT (Linking Your Thinking)
            # Notes go into 'notes/' and suggest an MOC (Map of Content)
            moc_name = None
            for topic in [
                "AI",
                "Software Architecture",
                "Distributed Systems",
                "Frontend",
                "Backend",
                "Productivity",
                "Research",
            ]:
                if topic.lower() in title_lower or topic.lower() in content_lower:
                    moc_name = f"MOC - {topic}"
                    break
            if not moc_name:
                moc_name = f"MOC - {clean_title.split()[0]} Index" if clean_title else "MOC - General Index"

            filename = f"{clean_title}.md"
            folder = "notes"
            if "atomic-note" not in tags_list:
                tags_list.append("atomic-note")

            return RouteSuggestion(
                mode="lyt",
                suggested_filename=filename,
                suggested_folder=folder,
                suggested_rel_path=f"{folder}/{filename}",
                suggested_tags=tags_list,
                moc_recommendation=f"[[{moc_name}]]",
                reasoning=f"Atomic note routed to notes/ with linking recommendation to {moc_name}.",
            )

        elif mode == "zettelkasten":
            # Zettelkasten
            # Time-sortable UID + Title: e.g. 202608062215-graph-algorithms.md
            filename = f"{zettelkasten_uid}-{clean_title}.md"
            folder = "permanent-notes"
            if "zettel" not in tags_list:
                tags_list.append("zettel")

            return RouteSuggestion(
                mode="zettelkasten",
                suggested_filename=filename,
                suggested_folder=folder,
                suggested_rel_path=f"{folder}/{filename}",
                suggested_tags=tags_list,
                zettelkasten_uid=zettelkasten_uid,
                reasoning="Generated time-sortable collision-resistant Zettelkasten identifier with flat slip-box routing.",
            )

        else:
            # Generic: sources, concepts, entities, sessions
            if any(w in title_lower for w in ["source", "paper", "book", "article", "transcript"]):
                folder = "sources"
                reason = "Type-based folder routing for external sources and media."
            elif any(w in title_lower for w in ["concept", "theory", "principle", "pattern"]):
                folder = "concepts"
                reason = "Type-based folder routing for theoretical models and concepts."
            elif any(w in title_lower for w in ["meeting", "session", "log", "daily"]):
                folder = "sessions"
                reason = "Type-based folder routing for meeting logs and daily work sessions."
            else:
                folder = "notes"
                reason = "Standard second brain note repository."

            filename = f"{clean_title}.md"
            return RouteSuggestion(
                mode="generic",
                suggested_filename=filename,
                suggested_folder=folder,
                suggested_rel_path=f"{folder}/{filename}",
                suggested_tags=tags_list,
                reasoning=reason,
            )
