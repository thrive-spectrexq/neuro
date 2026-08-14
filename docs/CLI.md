# Neuro CLI Reference Manual

The `neuro` command-line interface provides comprehensive control over your local knowledge base, database operations, architecture analysis, and Obsidian tools.

---

## 1. Global Commands

### Ingest Data
Ingest files or directories into Neuro with extension whitelisting and size validation:
```bash
neuro ingest <path>
```

### System Statistics
Display total counts of users, projects, notes, tasks, tags, and database health:
```bash
neuro stats
```

### MCP Server
Start the Model Context Protocol stdio server:
```bash
neuro mcp
```

### Learning Roadmap Generator
Generate prerequisite DAG learning maps with estimated study hours and difficulty levels:
```bash
neuro roadmap "Machine Learning" --depth intermediate
```

---

## 2. Database Subcommands (`neuro db`)

### Initialize Schema
Create all baseline tables, indexes, and SQLite FTS5 virtual tables:
```bash
neuro db init
```

### Validate Database
Verify schema integrity, foreign keys, and connectivity:
```bash
neuro db validate
```

### Seed Database
Idempotently seed the database with initial demo users, projects, notes, tags, and tasks:
```bash
neuro db seed
```

### Upgrade Schema (Alembic)
Run pending Alembic schema migrations:
```bash
neuro db upgrade head
```

### Prune Audit Logs
Clean up audit logs older than 30 days:
```bash
neuro db prune
```

---

## 3. Knowledge Graph Subcommands (`neuro graph`)

### Extract AST Graph
Extract semantic symbol and import relationships from a codebase:
```bash
neuro graph extract --path . --max-files 500
```

### Analyze Architecture
Detect God nodes, calculate Louvain community clusters, and identify circular dependencies:
```bash
neuro graph analyze --path .
```

### Compute Blast Radius
Test the ripple impact and affected dependencies of changing a symbol or module:
```bash
neuro graph impact NoteService --depth 3
```

### Generate Wiki
Generate Wikipedia-style markdown articles documenting code components:
```bash
neuro graph wiki --out-dir ./wiki
```

---

## 4. Obsidian Subcommands (`neuro obsidian`)

### Lint Vault
Perform diagnostic audits for broken `[[wikilinks]]`, orphan notes, and metadata gaps:
```bash
neuro obsidian lint --path /path/to/vault
```

### Generate Canvas
Generate native Obsidian JSON Canvas 1.0 spatial maps:
```bash
neuro obsidian canvas --title "System Map" --out knowledge.canvas
```

### Route Note
Suggest optimal destination folder, filename, and tags according to PARA, LYT, or Zettelkasten:
```bash
neuro obsidian route "Async Connection Pooling" --mode para
```
