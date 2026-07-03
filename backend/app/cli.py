import typer
from typing import Optional
from pathlib import Path
import subprocess

app = typer.Typer(help="Neuro CLI Tool")

db_app = typer.Typer()
app.add_typer(db_app, name="db", help="Database operations")

plugin_app = typer.Typer()
app.add_typer(plugin_app, name="plugin", help="Plugin management")


@db_app.command("upgrade")
def db_upgrade(revision: str = "head"):
    """Upgrade database to the latest revision."""
    typer.echo(f"Upgrading database to {revision}...")
    try:
        subprocess.run(["alembic", "upgrade", revision], check=True)
        typer.echo("Database upgraded successfully.")
    except subprocess.CalledProcessError as e:
        typer.echo(f"Error upgrading database: {e}")
        raise typer.Exit(1)


@plugin_app.command("create")
def plugin_create(name: str):
    """Create a new plugin scaffold."""
    typer.echo(f"Creating plugin '{name}'...")
    
    # Example plugin directory relative to current working directory
    plugin_dir = Path.cwd() / "plugins" / name
    if plugin_dir.exists():
        typer.echo(f"Plugin '{name}' already exists.")
        raise typer.Exit(1)
    
    plugin_dir.mkdir(parents=True)
    (plugin_dir / "__init__.py").write_text("")
    (plugin_dir / "plugin.py").write_text(f'"""{name} Plugin"""\n\ndef register():\n    print("Registering {name} plugin")\n')
    typer.echo(f"Plugin '{name}' created at {plugin_dir}")


@app.command("ingest")
def ingest_data(path: Path):
    """Ingest a file or folder into the Neuro second brain."""
    if not path.exists():
        typer.echo(f"Path '{path}' does not exist.")
        raise typer.Exit(1)
    
    typer.echo(f"Ingesting data from '{path}'...")
    if path.is_file():
        typer.echo(f"Processing file: {path.name}")
    elif path.is_dir():
        typer.echo(f"Processing directory: {path.name}")
    
    typer.echo("Ingestion complete.")


if __name__ == "__main__":
    app()
