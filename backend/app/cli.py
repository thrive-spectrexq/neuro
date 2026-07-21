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
def db_upgrade(revision: str = "head"):
    """Upgrade database schema using Alembic."""
    typer.echo(f"Upgrading database to {revision}...")
    try:
        subprocess.run(["alembic", "upgrade", revision], check=True)
        typer.echo("Database upgraded successfully.")
    except subprocess.CalledProcessError as e:
        typer.echo(f"Error upgrading database: {e}")
        raise typer.Exit(1)


@db_app.command("init")
def db_init():
    """Initialize database tables."""
    typer.echo("Initializing database and tables...")
    from app.core.database import create_db_and_tables

    asyncio.run(create_db_and_tables())
    typer.echo("Database tables created.")


@db_app.command("seed")
def db_seed():
    """Seeds the database with sample data (a user, some notes, tags, a project)."""
    typer.echo("Seeding database with sample data...")

    async def seed_data():
        from sqlalchemy.ext.asyncio import AsyncSession

        from app.core.database import engine
        from app.core.security import get_password_hash
        from app.models.note import Note, NoteLink
        from app.models.project import Project, ProjectMember, Role
        from app.models.tag import NoteTag, Tag
        from app.models.task import Task
        from app.models.user import User

        async with AsyncSession(engine) as session:
            # Check if user already exists
            from sqlmodel import select

            user = (await session.execute(select(User).limit(1))).scalar()
            if not user:
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
            task1 = Task(title="Design UI", status="todo", project_id=p1.id)
            task2 = Task(title="Write Backend", status="in_progress", project_id=p1.id)
            task3 = Task(title="Deploy V1", status="todo", project_id=p2.id)
            session.add_all([task1, task2, task3])

            await session.commit()

    asyncio.run(seed_data())
    typer.echo("Database seeded successfully.")


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
def plugin_create(name: str):
    """Scaffold a new plugin in the plugins directory."""
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
def plugin_list():
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
def notes_list(limit: int = 10):
    """List notes in the knowledge base."""
    typer.echo(f"Listing top {limit} notes...")
    # CLI note list logic
    typer.echo("Use API GET /api/v1/notes or view in Desktop app.")


@app.command("ingest")
def ingest_data(path: Path):
    """Ingest a file or directory into Neuro."""
    if not path.exists():
        typer.echo(f"Path '{path}' does not exist.")
        raise typer.Exit(1)

    typer.echo(f"Ingesting data from '{path}'...")
    if path.is_file():
        typer.echo(f"Processing file: {path.name}")
    elif path.is_dir():
        typer.echo(f"Processing directory: {path.name}")

    typer.echo("Ingestion pipeline queued.")


@app.command("stats")
def system_stats():
    """Display system status and entity counts."""
    typer.echo("Neuro System Overview:")
    typer.echo(" - Framework: FastAPI + SQLModel")
    typer.echo(" - Storage: SQLite / ChromaDB")
    typer.echo(" - AI Engine: Multi-provider (Ollama / OpenAI / Anthropic)")

    async def get_stats():
        from sqlalchemy.ext.asyncio import AsyncSession
        from sqlmodel import func, select

        from app.core.database import engine
        from app.models.note import Note
        from app.models.project import Project
        from app.models.tag import Tag
        from app.models.task import Task
        from app.models.user import User

        async with AsyncSession(engine) as session:
            u_count = (await session.execute(select(func.count(User.id)))).scalar()
            p_count = (await session.execute(select(func.count(Project.id)))).scalar()
            n_count = (await session.execute(select(func.count(Note.id)))).scalar()
            t_count = (await session.execute(select(func.count(Task.id)))).scalar()
            tag_count = (await session.execute(select(func.count(Tag.id)))).scalar()
            return u_count, p_count, n_count, t_count, tag_count

    try:
        u, p, n, t, tg = asyncio.run(get_stats())
        typer.echo(f" - Stats: Users ({u}), Projects ({p}), Notes ({n}), Tasks ({t}), Tags ({tg})")
    except Exception as e:
        typer.echo(f" - Stats: Could not retrieve stats (DB might not be initialized). Error: {e}")


if __name__ == "__main__":
    app()
