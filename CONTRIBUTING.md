# Contributing to Neuro

Thank you for your interest in contributing. Neuro is a community-driven project and contributions of all kinds are welcome — bug reports, documentation, new features, plugin development, and code review.

Please read this guide before opening issues or pull requests. It exists to make the process smooth for everyone.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Ways to Contribute](#ways-to-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Branching Strategy](#branching-strategy)
- [Making Changes](#making-changes)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Testing](#testing)
- [Documentation](#documentation)
- [Plugin Contributions](#plugin-contributions)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)
- [Security Vulnerabilities](#security-vulnerabilities)
- [Maintainers](#maintainers)

---

## Code of Conduct

This project follows a simple standard: be respectful, constructive, and assume good faith. Harassment, discrimination, and bad-faith behavior of any kind will not be tolerated and may result in permanent removal from the project.

If you experience or witness unacceptable behavior, report it by opening a private issue or contacting the maintainers directly.

---

## Getting Started

1. **Read the README** to understand what Neuro is, how it's structured, and what's planned.
2. **Browse open issues** — especially those tagged `good first issue` or `help wanted`.
3. **Check the roadmap** in `docs/roadmap.md` before starting large feature work.
4. **Open an issue first** if you plan to build something significant. This avoids duplicated effort and lets maintainers give early feedback on direction.

---

## Ways to Contribute

**Code**
- Bug fixes
- Feature implementation from the roadmap
- Performance improvements
- Plugin development

**Non-code**
- Bug reports with clear reproduction steps
- Documentation improvements and corrections
- Translations
- UX feedback and design suggestions
- Code review on open PRs

All contributions are valued. A well-written bug report or documentation fix is just as useful as a feature PR.

---

## Development Setup

### Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Python | 3.12+ | Backend runtime |
| Node.js | 20+ | Frontend & Electron |
| pnpm | 9+ | JS package manager |
| Redis | 7+ | Task queue & cache |
| Git | 2.40+ | |
| Ollama | latest | Optional, for local AI |

### Fork and Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/neuro.git
cd neuro

# Add the upstream remote
git remote add upstream https://github.com/thrive-spectrexq/neuro.git
```

### Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
cp ../.env.example ../.env
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
# Install all JS dependencies from the root
pnpm install

# Desktop app
cd apps/desktop && pnpm dev

# Web app
cd apps/web && pnpm dev
```

### Verify Everything Works

```bash
# Run all tests
./scripts/test.sh

# Or individually
cd backend && pytest
pnpm test
```

If setup fails, open an issue with the error output and your OS and tool versions. Setup issues are bugs worth fixing.

---

## Project Structure

Understanding where things live will help you find the right place for your changes.

```
neuro/
├── apps/desktop/          # Electron desktop app (TypeScript + React)
├── apps/web/              # Browser app (TypeScript + React)
├── backend/app/
│   ├── api/               # FastAPI route handlers
│   ├── core/              # Config, security, logging
│   ├── models/            # SQLModel database models
│   ├── schemas/           # Pydantic request/response schemas
│   ├── services/          # Business logic (AI, search, ingestion, automation)
│   └── workers/           # Celery background tasks
├── packages/
│   ├── ui/                # Shared React component library
│   ├── shared/            # Shared types and utilities
│   └── sdk/               # Plugin SDK
├── plugins/               # Plugin templates and examples
└── docs/                  # Architecture docs, API reference, guides
```

**General rule:** route handlers stay thin. Business logic belongs in `services/`. Models belong in `models/`. Schemas are for API boundaries only, not internal data passing.

---

## Branching Strategy

The repository uses a simple trunk-based model.

| Branch | Purpose |
|---|---|
| `main` | Stable, always deployable |
| `dev` | Integration branch for in-progress work |
| `feature/your-feature` | Feature branches, cut from `dev` |
| `fix/issue-description` | Bug fix branches, cut from `dev` or `main` |
| `docs/topic` | Documentation-only changes |

**Always branch from `dev`**, not `main`, unless you are patching a critical production bug.

```bash
# Sync your fork before starting new work
git fetch upstream
git checkout dev
git merge upstream/dev

# Create your branch
git checkout -b feature/your-feature-name
```

---

## Making Changes

### Before You Start

- Search existing issues and PRs to confirm the work isn't already underway.
- For anything non-trivial (new features, architectural changes, new dependencies), open an issue first and wait for a maintainer to indicate it's a good direction.
- Keep pull requests focused. One PR = one concern. A PR that fixes a bug, refactors a module, and adds a feature is difficult to review and will be asked to be split.

### During Development

- Write or update tests alongside your code, not after.
- Keep the public API surface stable. Breaking changes require discussion and a migration path.
- Avoid adding new dependencies without a clear reason. If you need to add one, note it explicitly in the PR description.
- Do not auto-format files unrelated to your change. Unrelated formatting noise makes diffs harder to review.

---

## Commit Messages

Neuro uses [Conventional Commits](https://www.conventionalcommits.org/).

**Format:**

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

**Types:**

| Type | When to Use |
|---|---|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation only |
| `style` | Formatting, whitespace (no logic change) |
| `refactor` | Code restructure with no behavior change |
| `perf` | Performance improvement |
| `test` | Adding or fixing tests |
| `chore` | Build process, tooling, dependency updates |
| `ci` | CI/CD configuration changes |

**Scopes** (optional but encouraged): `api`, `ui`, `search`, `ai`, `plugin`, `auth`, `db`, `worker`, `docs`, `desktop`, `web`

**Examples:**

```
feat(search): add hybrid full-text and vector search ranking

fix(auth): correct JWT expiry calculation for refresh tokens

docs(plugin): add example plugin for custom importers

chore(deps): bump FastAPI to 0.115.0
```

**Rules:**
- Use the imperative mood in the description: "add", not "added" or "adds"
- Keep the first line under 72 characters
- Reference issue numbers in the footer: `Closes #123`
- Mark breaking changes with `BREAKING CHANGE:` in the footer

---

## Pull Request Process

### Before Opening

- [ ] Tests pass locally (`./scripts/test.sh`)
- [ ] Linting passes (see [Code Style](#code-style))
- [ ] New code has test coverage
- [ ] Documentation is updated if the behavior or API changed
- [ ] Branch is up to date with `upstream/dev`

### Opening the PR

Use the PR template when available. At minimum, include:

1. **What this changes** — a concise description of what the PR does
2. **Why** — the motivation or issue it addresses
3. **How to test** — steps to verify the change works correctly
4. **Related issues** — link to any associated issues with `Closes #N`

Keep the PR description honest. If something is incomplete or has a known caveat, say so.

### Review Process

- A maintainer will review within a few days. If there's no response after a week, feel free to comment on the PR as a nudge.
- Address review comments with commits or replies. Mark conversations as resolved once addressed.
- Do not force-push to a branch under active review without warning — it makes it difficult to track what changed.
- PRs require at least one approving review from a maintainer before merge.
- Maintainers may close PRs that are stale, out of scope, or do not meet quality standards, with an explanation.

---

## Code Style

### Python

Neuro uses `ruff` for linting and formatting.

```bash
cd backend

# Check
ruff check .

# Format
ruff format .

# Both (recommended before committing)
ruff check . && ruff format .
```

**Key conventions:**
- Type annotations are required for all function signatures
- Use `pydantic` models for data validation, not raw dicts at API boundaries
- Services should be stateless and injectable
- Keep functions short and single-purpose
- Use `async`/`await` consistently — do not mix sync and async in the same service layer

### TypeScript

Neuro uses `eslint` and `prettier` for TypeScript.

```bash
# From root
pnpm lint          # ESLint
pnpm format        # Prettier
pnpm typecheck     # tsc --noEmit
```

**Key conventions:**
- Strict TypeScript — avoid `any`. Use `unknown` and narrow it.
- Prefer named exports over default exports in component files (except page components)
- Co-locate hooks and logic with the component they serve unless they are shared
- Zustand slices should be domain-scoped and not cross-import each other
- Use TanStack Query for all server state. Local UI state goes in Zustand or `useState`.

### General

- No commented-out code in committed files
- No `console.log` or `print()` debug statements in committed code
- Keep files under ~400 lines; split if they grow beyond that
- Prefer clarity over cleverness

---

## Testing

### Backend (Python)

Tests live in `backend/tests/` and use `pytest`.

```bash
cd backend

# All tests
pytest

# With coverage
pytest --cov=app --cov-report=term-missing

# Specific file or test
pytest tests/unit/test_search.py
pytest tests/unit/test_search.py::test_vector_ranking
```

**Test structure:**

| Directory | What to test |
|---|---|
| `tests/unit/` | Individual functions and services in isolation. Use mocks for external dependencies. |
| `tests/integration/` | Multiple components working together, including real database calls. |
| `tests/e2e/` | Full API flows from HTTP request to response. |

**Rules:**
- Every new service method needs at least one unit test
- Every new API endpoint needs at least one integration test
- Tests must be deterministic and not depend on execution order
- Mock external services (AI providers, ChromaDB) in unit tests
- Use fixtures for shared setup, not repeated code in test functions

### Frontend (TypeScript)

```bash
# From root or app directory
pnpm test

# Watch mode
pnpm test --watch
```

Test React components with React Testing Library. Test hooks with `renderHook`. Avoid testing implementation details — test behavior from the user's perspective.

---

## Documentation

Documentation lives in `docs/`. Keeping it accurate is as important as keeping code correct.

**Update documentation when you:**
- Add or change an API endpoint
- Add or change a configuration option
- Change the behavior of an existing feature
- Add a new plugin hook or SDK method

**Documentation types:**

| Location | Contents |
|---|---|
| `docs/architecture/` | System design, data flow, component responsibilities |
| `docs/api/` | API endpoint reference (auto-generated where possible) |
| `docs/guides/` | How-to guides for users and developers |
| `README.md` | Project overview, quickstart, high-level reference |
| `CONTRIBUTING.md` | This file |

Write documentation in plain Markdown. Avoid jargon where plain language works. Code examples should be minimal and runnable.

---

## Plugin Contributions

Plugins extend Neuro without modifying the core codebase. They are the preferred way to add domain-specific functionality.

### Adding a Plugin to the Registry

If you have built a plugin you want to share with the community:

1. Ensure your plugin is publicly available (GitHub is fine)
2. Ensure it has a `README.md`, a license, and a working `package.json` or `pyproject.toml`
3. Open a PR that adds an entry to `plugins/registry.json`

Registry entries follow this format:

```json
{
  "id": "your-plugin-id",
  "name": "Your Plugin Name",
  "description": "One sentence description of what it does.",
  "author": "your-github-username",
  "repository": "https://github.com/your-username/neuro-plugin-name",
  "version": "0.1.0",
  "tags": ["importer", "ai", "automation"]
}
```

### Plugin Standards

Community plugins listed in the registry must:

- Not collect or transmit user data without explicit user consent and disclosure
- Not modify core Neuro internals outside of the SDK interface
- Include a clear, honest description of what they do
- Be maintained by the author (stale/broken plugins will be removed from the registry)

---

## Reporting Bugs

Before opening a bug report, search existing issues to see if it has already been reported.

A good bug report includes:

- **Neuro version** and how you installed it
- **Operating system and version**
- **Steps to reproduce** — exact steps, numbered, starting from a fresh state
- **Expected behavior** — what you expected to happen
- **Actual behavior** — what actually happened
- **Logs or error output** — paste relevant output in a code block
- **Screenshots** if the issue is visual

Open bug reports using the **Bug Report** issue template on GitHub.

---

## Requesting Features

Feature requests are welcome. Before opening one:

- Check the roadmap (`docs/roadmap.md`) — it may already be planned
- Search existing issues for similar requests

A good feature request explains:

- **The problem** you are trying to solve, not just the solution
- **Who it helps** — is this a niche use case or broadly useful?
- **How it might work** — rough ideas are fine, a detailed spec is better

Feature requests are triaged by maintainers. Not all requests will be accepted, especially those that conflict with the project's scope or principles. If a request is declined, it may still be a good candidate for a plugin.

---

## Security Vulnerabilities

**Do not open public GitHub issues for security vulnerabilities.**

If you discover a security issue, please report it privately by emailing the maintainers or using GitHub's private security advisory feature. Include:

- A description of the vulnerability
- Steps to reproduce or a proof of concept
- Potential impact
- Any suggested mitigations if you have them

We will acknowledge receipt within 48 hours and aim to resolve critical issues within 14 days. You will be credited in the release notes unless you prefer to remain anonymous.

---

If you are interested in becoming a regular contributor or taking on a maintainer role, reach out by opening an issue or commenting on the project discussions.
