from __future__ import annotations

import logging
from collections import defaultdict

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_session
from app.core.security import get_current_user_optional
from app.models.note import Note, NoteLink
from app.models.tag import NoteTag, Tag
from app.models.user import User
from app.services.obsidian_canvas_service import CanvasDocument, ObsidianCanvasService
from app.services.obsidian_lint_service import ObsidianLintService, VaultLintReport
from app.services.obsidian_mode_service import ObsidianModeService, RouteSuggestion
from app.services.obsidian_retrieval_service import ObsidianRetrievalService, RetrievalResult
from app.services.obsidian_service import (
    ObsidianExportPackage,
    ObsidianImportItem,
    ObsidianService,
)

logger = logging.getLogger(__name__)
router = APIRouter()


class ImportVaultRequest(BaseModel):
    files: list[ObsidianImportItem]


@router.post("/export", response_model=ObsidianExportPackage)
async def export_obsidian_vault(
    session: AsyncSession = Depends(get_session),
    current_user: User | None = Depends(get_current_user_optional),
):
    """
    Exports the entire Second Brain into structured Obsidian Markdown files with frontmatter and wikilinks.
    """
    if current_user:
        notes_stmt = select(Note).where(Note.user_id == current_user.id)
    else:
        notes_stmt = select(Note)

    notes_result = await session.execute(notes_stmt)
    notes = notes_result.scalars().all()

    if not notes:
        return ObsidianExportPackage(
            exported_at="",
            vault_name="Neuro-Second-Brain",
            file_count=0,
            files=[],
        )

    note_ids = [n.id for n in notes]

    # Fetch links
    links_res = await session.execute(
        select(NoteLink).where(NoteLink.source_id.in_(note_ids), NoteLink.target_id.in_(note_ids))
    )
    links = links_res.scalars().all()

    # Fetch tags
    tags_res = await session.execute(select(NoteTag).where(NoteTag.note_id.in_(note_ids)))
    note_tags = tags_res.scalars().all()
    all_tag_ids = list({nt.tag_id for nt in note_tags})

    tag_name_map = {}
    if all_tag_ids:
        tag_objs = await session.execute(select(Tag).where(Tag.id.in_(all_tag_ids)))
        tag_name_map = {t.id: t.name for t in tag_objs.scalars().all()}

    tags_by_note = defaultdict(list)
    for nt in note_tags:
        if nt.tag_id in tag_name_map:
            tags_by_note[str(nt.note_id)].append(tag_name_map[nt.tag_id])

    return ObsidianService.export_vault(
        notes=notes,
        links=links,
        tags_by_note_id=tags_by_note,
        vault_name="Neuro-Second-Brain",
    )


@router.get("/export/zip")
async def export_obsidian_vault_zip(
    session: AsyncSession = Depends(get_session),
    current_user: User | None = Depends(get_current_user_optional),
):
    """
    Generates and streams a downloadable ZIP file of the Obsidian vault.
    """
    package = await export_obsidian_vault(session=session, current_user=current_user)
    zip_bytes = ObsidianService.create_vault_zip(package)

    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="neuro_obsidian_vault.zip"'},
    )


@router.post("/import")
async def import_obsidian_vault(
    request: ImportVaultRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User | None = Depends(get_current_user_optional),
):
    """
    Ingests Obsidian markdown files, extracting YAML frontmatter, [[wikilinks]], and #tags.
    """
    user_id = current_user.id if current_user else None
    imported_notes = []
    title_to_note_map = {}

    for item in request.files:
        parsed = ObsidianService.parse_obsidian_markdown(item.content, filename=item.filename)
        title = parsed["title"]

        # Create note
        new_note = Note(
            title=title,
            content=parsed["content"],
            user_id=user_id,
        )
        session.add(new_note)
        await session.commit()
        await session.refresh(new_note)

        title_to_note_map[title.lower()] = new_note
        imported_notes.append((new_note, parsed))

        # Add tags
        for tag_str in parsed["tags"]:
            tag_clean = tag_str.replace("#", "").strip()
            if not tag_clean:
                continue

            tag_res = await session.execute(select(Tag).where(Tag.name == tag_clean))
            tag_obj = tag_res.scalars().first()
            if not tag_obj:
                tag_obj = Tag(name=tag_clean)
                session.add(tag_obj)
                await session.commit()
                await session.refresh(tag_obj)

            session.add(NoteTag(note_id=new_note.id, tag_id=tag_obj.id))

    # Second pass: resolve [[wikilinks]]
    created_links_count = 0
    for note, parsed in imported_notes:
        for link_target_title in parsed["wikilinks"]:
            target_clean = link_target_title.lower().strip()
            target_note = title_to_note_map.get(target_clean)
            if target_note and target_note.id != note.id:
                session.add(NoteLink(source_id=note.id, target_id=target_note.id))
                created_links_count += 1

    await session.commit()

    return {
        "status": "success",
        "imported_notes_count": len(imported_notes),
        "created_links_count": created_links_count,
    }


class LintVaultApiRequest(BaseModel):
    vault_path: str | None = None


@router.post("/lint", response_model=VaultLintReport)
async def lint_vault(
    request: LintVaultApiRequest | None = None,
    session: AsyncSession = Depends(get_session),
    current_user: User | None = Depends(get_current_user_optional),
):
    """
    Runs deterministic linting and health diagnostics across the vault.
    Identifies dead links, orphan notes, metadata gaps, and empty sections.
    """
    if request and request.vault_path:
        return ObsidianLintService.lint_filesystem_vault(request.vault_path)

    # Lint database notes
    notes_stmt = select(Note).where(Note.user_id == current_user.id) if current_user else select(Note)
    notes_res = await session.execute(notes_stmt)
    notes = notes_res.scalars().all()

    # Load tags
    note_ids = [n.id for n in notes]
    tags_res = await session.execute(select(NoteTag).where(NoteTag.note_id.in_(note_ids)))
    note_tags = tags_res.scalars().all()
    all_tag_ids = list({nt.tag_id for nt in note_tags})
    tag_name_map = {}
    if all_tag_ids:
        tag_objs = await session.execute(select(Tag).where(Tag.id.in_(all_tag_ids)))
        tag_name_map = {t.id: t.name for t in tag_objs.scalars().all()}

    tags_by_note = defaultdict(list)
    for nt in note_tags:
        if nt.tag_id in tag_name_map:
            tags_by_note[str(nt.note_id)].append(tag_name_map[nt.tag_id])

    notes_data = [
        {
            "id": str(n.id),
            "title": n.title,
            "content": n.content,
            "created_at": str(n.created_at) if hasattr(n, "created_at") else "now",
            "tags": tags_by_note.get(str(n.id), []),
        }
        for n in notes
    ]

    return ObsidianLintService.lint_notes(notes_data, vault_name="Neuro-Database-Vault")


class CreateCanvasApiRequest(BaseModel):
    title: str = "Knowledge Canvas"
    note_ids: list[str] | None = None


@router.post("/canvas", response_model=CanvasDocument)
async def generate_obsidian_canvas(
    request: CreateCanvasApiRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User | None = Depends(get_current_user_optional),
):
    """
    Generates a native Obsidian .canvas (JSON Canvas 1.0) spatial map.
    """
    notes_stmt = select(Note).where(Note.user_id == current_user.id) if current_user else select(Note)
    notes_res = await session.execute(notes_stmt)
    notes = notes_res.scalars().all()

    if request.note_ids:
        notes = [n for n in notes if str(n.id) in request.note_ids]

    note_ids = [n.id for n in notes]
    links_res = await session.execute(
        select(NoteLink).where(NoteLink.source_id.in_(note_ids), NoteLink.target_id.in_(note_ids))
    )
    links = links_res.scalars().all()

    notes_data = [
        {
            "id": str(n.id),
            "title": n.title,
            "content": n.content,
            "tags": [],
        }
        for n in notes
    ]
    links_data = [{"source": str(l.source_id), "target": str(l.target_id), "relation": "links_to"} for l in links]

    return ObsidianCanvasService.create_canvas_from_notes(notes_data, links_data, title=request.title)


class RetrieveBM25ApiRequest(BaseModel):
    query: str
    top_k: int = 10


@router.post("/retrieve", response_model=RetrievalResult)
async def retrieve_vault_bm25(
    request: RetrieveBM25ApiRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User | None = Depends(get_current_user_optional),
):
    """
    Performs deterministic Okapi BM25 ranking across vault notes with contextual prefixing.
    """
    notes_stmt = select(Note).where(Note.user_id == current_user.id) if current_user else select(Note)
    notes_res = await session.execute(notes_stmt)
    notes = notes_res.scalars().all()

    notes_data = [{"id": str(n.id), "title": n.title, "content": n.content, "tags": []} for n in notes]
    return ObsidianRetrievalService.search_bm25(request.query, notes_data, top_k=request.top_k)


class RouteNoteApiRequest(BaseModel):
    title: str
    content: str = ""
    tags: list[str] = []
    mode: str = "generic"  # generic, lyt, para, zettelkasten


@router.post("/route", response_model=RouteSuggestion)
async def route_note_methodology(request: RouteNoteApiRequest):
    """
    Routes a planned note according to PARA, LYT, Zettelkasten, or Generic methodology.
    """
    return ObsidianModeService.route_note(
        title=request.title,
        content=request.content,
        tags=request.tags,
        mode=request.mode,
    )

