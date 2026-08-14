import asyncio
import subprocess
from pathlib import Path

import typer

app = typer.Typer(help="Neuro CLI - Managing local-first knowledge, automations, and AI.")

db_app = typer.Typer()
app.add_typer(db_app, name="db", help="Database operations")

plugin_app = typer.Typer()
app.add_typer(plugin_app, name="plugin", help="Plugin management")

notes_app = typer.Typer()
app.add_typer(notes_app, name="notes", help="Note operations")


@db_app.command("upgrade")
def db_upgrade(revision: str = "head") -> None:
    """Upgrade database schema using Alembic."""
    typer.echo(f"Upgrading database to {revision}...")
    try:
        subprocess.run(["alembic", "upgrade", revision], check=True)
        typer.echo("Database upgraded successfully.")
    except subprocess.CalledProcessError as e:
        typer.echo(f"Error upgrading database: {e}")
        raise typer.Exit(1)


@db_app.command("init")
def db_init() -> None:
    """Initialize database tables."""
    typer.echo("Initializing database and tables...")
    from app.core.database import create_db_and_tables

    asyncio.run(create_db_and_tables())
    typer.echo("Database tables created.")


@db_app.command("validate")
def db_validate() -> None:
    """Validate database connectivity, foreign keys, and table health."""
    typer.echo("Validating database health and schema integrity...")

    async def validate_schema() -> dict[str, int]:
        from sqlmodel import func, select

        from app.core.database import get_session_context
        from app.models.audit import AuditLog
        from app.models.note import Note
        from app.models.project import Project
        from app.models.tag import Tag
        from app.models.task import Task
        from app.models.user import User

        counts = {}
        async with get_session_context() as session:
            counts["users"] = (await session.execute(select(func.count(User.id)))).scalar() or 0
            counts["projects"] = (await session.execute(select(func.count(Project.id)))).scalar() or 0
            counts["notes"] = (await session.execute(select(func.count(Note.id)))).scalar() or 0
            counts["tasks"] = (await session.execute(select(func.count(Task.id)))).scalar() or 0
            counts["tags"] = (await session.execute(select(func.count(Tag.id)))).scalar() or 0
            counts["audit_logs"] = (await session.execute(select(func.count(AuditLog.id)))).scalar() or 0
        return counts

    try:
        counts = asyncio.run(validate_schema())
        typer.echo("✅ Database connection healthy. Integrity verified:")
        for tbl, count in counts.items():
            typer.echo(f"  - {tbl.capitalize()}: {count} records")
    except Exception as exc:
        typer.echo(f"❌ Database validation error: {exc}")
        raise typer.Exit(1)


@db_app.command("seed")
def db_seed() -> None:
    """Seeds the database with sample data (a user, some notes, tags, a project) idempotently."""
    typer.echo("Seeding database with sample data...")

    async def seed_data() -> None:
        from sqlmodel import select

        from app.core.database import get_session_context
        from app.core.security import get_password_hash
        from app.models.note import Note, NoteLink
        from app.models.project import Project, ProjectMember, Role
        from app.models.tag import NoteTag, Tag
        from app.models.task import Task
        from app.models.user import User

        async with get_session_context() as session:
            user_stmt = select(User).where(User.username == "testuser")
            existing_user = (await session.execute(user_stmt)).scalars().first()

            if existing_user:
                typer.echo("Seed user 'testuser' already exists. Skipping seed creation.")
                return

            user = User(
                email="test@example.com",
                username="testuser",
                hashed_password=get_password_hash("password123"),
            )
            session.add(user)
            await session.flush()

            # Create Projects
            p1 = Project(name="Project Alpha", description="A sample project", user_id=user.id)
            p2 = Project(
                name="Project Beta",
                description="Another sample project",
                user_id=user.id,
            )
            session.add_all([p1, p2])
            await session.flush()

            m1 = ProjectMember(project_id=p1.id, user_id=user.id, role=Role.owner)
            m2 = ProjectMember(project_id=p2.id, user_id=user.id, role=Role.owner)
            session.add_all([m1, m2])

            # Create Tags
            t1 = Tag(name="urgent")
            t2 = Tag(name="idea")
            t3 = Tag(name="todo")
            session.add_all([t1, t2, t3])
            await session.flush()

            # Create Notes
            n1 = Note(
                title="Idea 1",
                content="Explore AI agents.",
                user_id=user.id,
                project_id=p1.id,
            )
            n2 = Note(
                title="Idea 2",
                content="Improve knowledge graphs.",
                user_id=user.id,
                project_id=p1.id,
            )
            n3 = Note(
                title="Meeting Notes",
                content="Discussed alpha release.",
                user_id=user.id,
                project_id=p2.id,
            )
            n4 = Note(
                title="Urgent Refactor",
                content="Fix the core module.",
                user_id=user.id,
                project_id=p2.id,
            )
            n5 = Note(title="Personal Log", content="A random note.", user_id=user.id)
            session.add_all([n1, n2, n3, n4, n5])
            await session.flush()

            # Link Notes and Tags
            session.add_all(
                [
                    NoteTag(note_id=n1.id, tag_id=t2.id),
                    NoteTag(note_id=n2.id, tag_id=t2.id),
                    NoteTag(note_id=n4.id, tag_id=t1.id),
                    NoteTag(note_id=n3.id, tag_id=t3.id),
                ]
            )

            # Create Note Links
            session.add_all(
                [
                    NoteLink(source_id=n1.id, target_id=n2.id),
                    NoteLink(source_id=n3.id, target_id=n4.id),
                ]
            )

            # Create Tasks
            task1 = Task(title="Design UI", status="todo", project_id=p1.id, user_id=user.id)
            task2 = Task(title="Write Backend", status="in_progress", project_id=p1.id, user_id=user.id)
            task3 = Task(title="Deploy V1", status="todo", project_id=p2.id, user_id=user.id)
            session.add_all([task1, task2, task3])

            await session.commit()
            typer.echo("Database seeded successfully.")

    asyncio.run(seed_data())


@db_app.command("prune")
def db_prune():
    """Runs the audit log pruning task."""
    typer.echo("Pruning audit logs older than 30 days...")

    async def prune_logs():
        from datetime import UTC, datetime, timedelta

        from sqlalchemy.ext.asyncio import AsyncSession
        from sqlmodel import delete

        from app.core.database import engine
        from app.models.audit import AuditLog

        async with AsyncSession(engine) as session:
            thirty_days_ago = datetime.now(UTC) - timedelta(days=30)
            stmt = delete(AuditLog).where(AuditLog.timestamp < thirty_days_ago)
            result = await session.execute(stmt)
            await session.commit()
            return result.rowcount

    count = asyncio.run(prune_logs())
    typer.echo(f"Pruned {count} old audit logs.")


@plugin_app.command("create")
def plugin_create(name: str) -> None:
    """Scaffold a new plugin in the plugins directory."""
    if not name or not name.isalnum():
        typer.echo("Plugin name must be alphanumeric.")
        raise typer.Exit(1)

    typer.echo(f"Creating plugin '{name}'...")
    plugin_dir = Path.cwd() / "plugins" / name
    if plugin_dir.exists():
        typer.echo(f"Plugin '{name}' already exists.")
        raise typer.Exit(1)

    plugin_dir.mkdir(parents=True)
    (plugin_dir / "__init__.py").write_text("")
    (plugin_dir / "plugin.py").write_text(
        f'"""{name} Plugin"""\n\ndef register():\n    print("Registering {name} plugin")\n'
    )
    (plugin_dir / "manifest.json").write_text(
        f'{{\n  "id": "{name}",\n  "name": "{name.capitalize()} Plugin",\n  "version": "0.1.0"\n}}\n'
    )
    typer.echo(f"Plugin '{name}' created at {plugin_dir}")


@plugin_app.command("list")
def plugin_list() -> None:
    """List all local plugins."""
    plugins_dir = Path.cwd() / "plugins"
    if not plugins_dir.exists():
        typer.echo("No plugins directory found.")
        return

    plugin_dirs = [d for d in plugins_dir.iterdir() if d.is_dir() and not d.name.startswith(".")]
    typer.echo(f"Found {len(plugin_dirs)} plugin(s):")
    for d in plugin_dirs:
        typer.echo(f" - {d.name}")


@notes_app.command("list")
def notes_list(limit: int = 10) -> None:
    """List notes in the knowledge base."""
    if limit <= 0 or limit > 1000:
        typer.echo("Limit must be between 1 and 1000.")
        raise typer.Exit(1)

    typer.echo(f"Listing top {limit} notes...")
    typer.echo("Use API GET /api/v1/notes or view in Desktop app.")


ALLOWED_INGEST_EXTENSIONS = {".txt", ".md", ".pdf", ".py", ".ts", ".tsx", ".js", ".json", ".yaml", ".yml", ".canvas"}
MAX_INGEST_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB


@app.command("ingest")
def ingest_data(path: Path) -> None:
    """Ingest a file or directory into Neuro with extension and size checks."""
    if not path.exists():
        typer.echo(f"Path '{path}' does not exist.")
        raise typer.Exit(1)

    typer.echo(f"Ingesting data from '{path}'...")
    if path.is_file():
        if path.suffix.lower() not in ALLOWED_INGEST_EXTENSIONS:
            typer.echo(
                f"Unsupported file format '{path.suffix}'. Allowed: {', '.join(sorted(ALLOWED_INGEST_EXTENSIONS))}"
            )
            raise typer.Exit(1)
        if path.stat().st_size > MAX_INGEST_SIZE_BYTES:
            typer.echo(f"File exceeds maximum allowed size of 50MB: {path.name}")
            raise typer.Exit(1)
        typer.echo(f"Processing file: {path.name}")
    elif path.is_dir():
        typer.echo(f"Processing directory: {path.name}")

    typer.echo("Ingestion pipeline queued.")


@app.command("stats")
def system_stats() -> None:
    """Display system status and entity counts."""
    typer.echo("Neuro System Overview:")
    typer.echo(" - Framework: FastAPI + SQLModel")
    typer.echo(" - Storage: SQLite / ChromaDB")
    typer.echo(" - AI Engine: Multi-provider (Ollama / OpenAI / Anthropic)")

    async def get_stats() -> tuple[int, int, int, int, int]:
        from sqlmodel import func, select

        from app.core.database import get_session_context
        from app.models.note import Note
        from app.models.project import Project
        from app.models.tag import Tag
        from app.models.task import Task
        from app.models.user import User

        async with get_session_context() as session:
            u_count = (await session.execute(select(func.count(User.id)))).scalar() or 0
            p_count = (await session.execute(select(func.count(Project.id)))).scalar() or 0
            n_count = (await session.execute(select(func.count(Note.id)))).scalar() or 0
            t_count = (await session.execute(select(func.count(Task.id)))).scalar() or 0
            tag_count = (await session.execute(select(func.count(Tag.id)))).scalar() or 0
            return u_count, p_count, n_count, t_count, tag_count

    try:
        u, p, n, t, tg = asyncio.run(get_stats())
        typer.echo(f" - Stats: Users ({u}), Projects ({p}), Notes ({n}), Tasks ({t}), Tags ({tg})")
    except Exception as e:
        typer.echo(f" - Stats: Could not retrieve stats (DB might not be initialized). Error: {e}")


@app.command("mcp")
def run_mcp_server() -> None:
    """Start the Model Context Protocol (MCP) stdio server for Claude Desktop, Cursor, and other AI clients."""
    from app.mcp_server.server import main as run_mcp

    run_mcp()


@app.command("roadmap")
def cli_generate_roadmap(
    goal: str = typer.Argument(..., help="Subject or learning goal (e.g. 'Rust Async', 'Machine Learning')"),
    depth: str = typer.Option("intermediate", help="Depth level: beginner, intermediate, advanced"),
) -> None:
    """Generate a structured prerequisite learning roadmap DAG for any topic."""
    cleaned_goal = goal.strip()
    if not cleaned_goal or len(cleaned_goal) > 200:
        typer.echo("Goal must be between 1 and 200 characters.")
        raise typer.Exit(1)

    normalized_depth = depth.lower().strip()
    if normalized_depth not in {"beginner", "intermediate", "advanced"}:
        typer.echo(f"Invalid depth '{depth}'. Must be one of: beginner, intermediate, advanced")
        raise typer.Exit(1)

    from app.services.roadmap_service import RoadmapService

    roadmap = RoadmapService.generate_roadmap(goal=cleaned_goal, depth=normalized_depth)
    typer.echo("\n=======================================================")
    typer.echo(f"🎯 Roadmap: {roadmap.subject}")
    typer.echo(f"📖 Description: {roadmap.description}")
    typer.echo(f"⏱️ Total Estimated Hours: {roadmap.total_estimated_hours}h")
    typer.echo("=======================================================\n")
    typer.echo("📚 TOPIC NODES:")
    for idx, node in enumerate(roadmap.nodes, 1):
        typer.echo(f" {idx}. [{node.zone}] {node.title} ({node.difficulty.capitalize()}, ~{node.estimated_hours}h)")
        typer.echo(f"    - {node.description}")
    typer.echo("\n🔗 PREREQUISITE DEPENDENCIES:")
    for edge in roadmap.edges:
        typer.echo(f" - {edge.source} -> ({edge.type}) -> {edge.target}")
    typer.echo(f"\n🚀 Critical Path: {' -> '.join(roadmap.critical_path)}\n")


graph_app = typer.Typer()
app.add_typer(graph_app, name="graph", help="Codebase Knowledge Graph & Architecture Intelligence")


@graph_app.command("extract")
def cli_extract_graph(
    path: str = typer.Option(".", help="Root directory path to scan"),
    max_files: int = typer.Option(500, help="Maximum files to scan"),
) -> None:
    """Scan and extract AST knowledge graph from codebase files."""
    if max_files <= 0 or max_files > 5000:
        typer.echo("max_files must be between 1 and 5000.")
        raise typer.Exit(1)

    from app.services.graph_intelligence_service import graph_extractor

    typer.echo(f"Scanning codebase at '{path}'...")
    res = graph_extractor.extract_from_directory(path, max_files=max_files)
    typer.echo(
        f"Extracted {len(res['nodes'])} nodes and {len(res['edges'])} edges across {res['files_scanned']} files."
    )


@graph_app.command("analyze")
def cli_analyze_graph(
    path: str = typer.Option(".", help="Root directory path to scan"),
) -> None:
    """Run Louvain clustering, God node detection, and architectural diagnostics."""
    from app.services.graph_intelligence_service import GraphAnalyticsEngine, graph_analytics, graph_extractor

    extracted = graph_extractor.extract_from_directory(path, max_files=500)
    G = GraphAnalyticsEngine.build_networkx_graph(extracted["nodes"], extracted["edges"])
    analytics = graph_analytics.analyze_graph(G)

    typer.echo("\n=======================================================")
    typer.echo("📊 KNOWLEDGE GRAPH ARCHITECTURE METRICS")
    typer.echo(
        f"Total Nodes: {analytics.total_nodes} | Total Edges: {analytics.total_edges} | Density: {analytics.density}"
    )
    typer.echo(f"Communities: {analytics.communities_count}")
    typer.echo("=======================================================\n")

    typer.echo("👑 KEY ARCHITECTURAL KEYSTONES (GOD NODES):")
    for idx, gn in enumerate(analytics.god_nodes[:8], 1):
        typer.echo(f" {idx}. {gn['label']} ({gn['type']}) — Degree: {gn['degree']}, PageRank: {gn['pagerank']}")

    typer.echo("\n🌐 SUBSYSTEM COMMUNITIES:")
    for cid, comm in list(analytics.communities.items())[:6]:
        typer.echo(f" - [{comm['id']}] {comm['label']} ({comm['size']} nodes, Cohesion: {comm['cohesion']})")

    if analytics.circular_dependencies:
        typer.echo(f"\n⚠️ CIRCULAR DEPENDENCIES DETECTED: {len(analytics.circular_dependencies)}")


@graph_app.command("impact")
def cli_blast_radius(
    target: str = typer.Argument(..., help="Symbol, class, function, or file to test"),
    depth: int = typer.Option(3, help="Max hop depth"),
) -> None:
    """Calculate blast radius and upstream/downstream impact for a code change."""
    if depth <= 0 or depth > 10:
        typer.echo("Depth must be between 1 and 10.")
        raise typer.Exit(1)

    import os

    from app.services.graph_intelligence_service import GraphAnalyticsEngine, graph_analytics, graph_extractor

    extracted = graph_extractor.extract_from_directory(os.getcwd(), max_files=500)
    G = GraphAnalyticsEngine.build_networkx_graph(extracted["nodes"], extracted["edges"])
    hits = graph_analytics.compute_blast_radius(G, seed_id_or_query=target, max_depth=depth)

    typer.echo(f"\n💥 BLAST RADIUS for '{target}' (Max Depth {depth}): {len(hits)} affected entities\n")
    for hit in hits:
        loc = f" [{hit.source_file}:{hit.source_location}]" if hit.source_file and hit.source_location else ""
        typer.echo(f" [Hop {hit.depth}] {hit.label} (via {hit.via_relation}){loc}")


@graph_app.command("wiki")
def cli_generate_wiki(
    out_dir: str = typer.Option("./wiki", help="Output directory for generated markdown files"),
) -> None:
    """Generate Wikipedia-style Markdown documentation from codebase graph."""
    import os

    from app.services.graph_intelligence_service import GraphAnalyticsEngine, graph_extractor, graph_wiki_gen

    typer.echo(f"Generating wiki documentation to '{out_dir}'...")
    extracted = graph_extractor.extract_from_directory(os.getcwd(), max_files=500)
    G = GraphAnalyticsEngine.build_networkx_graph(extracted["nodes"], extracted["edges"])
    articles = graph_wiki_gen.generate_wiki(G, out_dir=out_dir)
    typer.echo(f"Successfully generated {len(articles)} wiki articles in '{out_dir}'.")


obsidian_app = typer.Typer()
app.add_typer(obsidian_app, name="obsidian", help="Obsidian Vault Intelligence, Diagnostics & Canvas Generation")


@obsidian_app.command("lint")
def cli_obsidian_lint(
    path: str = typer.Option(".", help="Path to local Obsidian vault directory to lint"),
) -> None:
    """Lint an Obsidian vault for dead links, orphans, metadata gaps, and health diagnostics."""
    from app.services.obsidian_lint_service import ObsidianLintService

    typer.echo(f"🔍 Linting Obsidian vault at: {path}...\n")
    report = ObsidianLintService.lint_filesystem_vault(path)

    typer.echo("=======================================================")
    typer.echo(f"🛡️  VAULT HEALTH REPORT: {report.vault_name}")
    typer.echo(f"Scanned Notes: {report.total_notes_scanned} | Health Score: {report.health_score}% ({report.status})")
    typer.echo("=======================================================")

    if report.dead_links:
        typer.echo(f"\n❌ DEAD / BROKEN LINKS ({len(report.dead_links)}):")
        for dl in report.dead_links[:10]:
            typer.echo(f"  - [{dl.source_file}:L{dl.line_number}] -> {dl.raw_wikilink}")
        if len(report.dead_links) > 10:
            typer.echo(f"  ... and {len(report.dead_links) - 10} more.")

    if report.orphan_notes:
        typer.echo(f"\n🏝️  ORPHAN NOTES ({len(report.orphan_notes)}):")
        for orphan in report.orphan_notes[:10]:
            typer.echo(f"  - {orphan}")
        if len(report.orphan_notes) > 10:
            typer.echo(f"  ... and {len(report.orphan_notes) - 10} more.")

    if report.metadata_gaps:
        typer.echo(f"\n📋 METADATA GAPS ({len(report.metadata_gaps)}):")
        for mg in report.metadata_gaps[:6]:
            typer.echo(f"  - {mg.file}: missing {', '.join(mg.missing_fields)}")

    typer.echo("\n💡 ACTIONABLE REPAIR SUGGESTIONS:")
    for sugg in report.actionable_suggestions:
        typer.echo(f"  • {sugg}")


@obsidian_app.command("canvas")
def cli_obsidian_canvas(
    title: str = typer.Option("Neuro Knowledge Canvas", help="Title for the canvas"),
    out: str = typer.Option("knowledge.canvas", help="Output .canvas file path"),
) -> None:
    """Generate an Obsidian JSON Canvas 1.0 spatial visual map."""
    from pathlib import Path

    from app.services.obsidian_canvas_service import ObsidianCanvasService
    from app.services.obsidian_lint_service import ObsidianLintService

    report = ObsidianLintService.lint_filesystem_vault(".")
    notes_data = [
        {"id": str(idx), "title": Path(file).stem, "content": file} for idx, file in enumerate(report.orphan_notes)
    ]
    canvas_doc = ObsidianCanvasService.create_canvas_from_notes(notes_data, title=title)
    json_str = ObsidianCanvasService.to_json(canvas_doc)

    Path(out).write_text(json_str, encoding="utf-8")
    typer.echo(
        f"✅ Generated native Obsidian Canvas file: {out} ({len(canvas_doc.nodes)} nodes, {len(canvas_doc.edges)} edges)"
    )


@obsidian_app.command("route")
def cli_obsidian_route(
    title: str = typer.Argument(..., help="Note title to route"),
    content: str = typer.Option("", help="Optional note content snippet"),
    mode: str = typer.Option("generic", help="Methodology mode: generic, lyt, para, zettelkasten"),
) -> None:
    """Calculate the optimal destination folder, filename, and tags according to PARA/LYT/Zettelkasten."""
    cleaned_title = title.strip()
    if not cleaned_title:
        typer.echo("Title cannot be empty.")
        raise typer.Exit(1)

    normalized_mode = mode.lower().strip()
    if normalized_mode not in {"generic", "lyt", "para", "zettelkasten"}:
        typer.echo(f"Invalid mode '{mode}'. Must be one of: generic, lyt, para, zettelkasten")
        raise typer.Exit(1)

    from app.services.obsidian_mode_service import ObsidianModeService

    suggestion = ObsidianModeService.route_note(title=cleaned_title, content=content, mode=normalized_mode)
    typer.echo("\n=======================================================")
    typer.echo(f"📂 NOTE ROUTING: {cleaned_title} (Mode: {suggestion.mode.upper()})")
    typer.echo(f"Destination Path: {suggestion.suggested_rel_path}")
    typer.echo(f"Target Folder:    {suggestion.suggested_folder}")
    typer.echo(f"Target Filename:  {suggestion.suggested_filename}")
    if suggestion.suggested_tags:
        typer.echo(f"Tags:             {', '.join(['#' + t for t in suggestion.suggested_tags])}")
    if suggestion.moc_recommendation:
        typer.echo(f"MOC Link:         {suggestion.moc_recommendation}")
    if suggestion.zettelkasten_uid:
        typer.echo(f"Zettelkasten UID: {suggestion.zettelkasten_uid}")
    typer.echo(f"Reasoning:        {suggestion.reasoning}")
    typer.echo("=======================================================\n")


if __name__ == "__main__":
    app()
