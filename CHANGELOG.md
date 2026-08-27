# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.2] - 2026-08-27

### Added
- **Vault Health & Diagnostics Dashboard (`VaultHealthPage`)**:
  - Interactive SVG circular health gauge computing real-time vault integrity (0–100).
  - Breakdown metrics for total notes, links, orphan notes, and dead wikilinks.
  - Collapsible category explorers for dead links, missing frontmatter, and empty note sections.
  - One-click auto-heal action buttons with live feedback.
  - Backend endpoints `GET /api/obsidian/health-summary` and `POST /api/obsidian/auto-heal`.
- **Source Ingestion Pipeline (`IngestPage`)**:
  - Interactive drag-and-drop ingestion zone supporting Markdown, Plaintext, PDF, and HTML.
  - URL capture input field.
  - 4-stage visual processing stepper (Capture → Extract → Link → File).
  - Content-addressed SHA-256 provenance ledger table for historical imports.
- **Design System Tokens**:
  - Extended Tailwind CSS theme with surface elevation hierarchy (`#07080c`, `#0a0c14`, `#0e111a`, `#141724`, `#1a1e2e`).
  - Semantic typography, button (`.btn-*`), card (`.card-surface`), badge (`.badge-*`), input, and animation tokens.

### Changed
- **Workstation Layout Shell (`Layout.tsx`)**:
  - Expanded 72px sidebar with animated sliding active indicator and floating tooltip shortcuts (`Alt+1` through `Alt+8`).
  - Header bar with dynamic breadcrumbs, command bar pill (`Ctrl+Space`), desktop orb window trigger, and live status badges.
- **Knowledge Vault Explorer (`NotesPage.tsx`)**:
  - Restyled card grid using `.card-surface` and staggered `animate-scale-in` layout.
  - Integrated wikilink counter and note metadata badges.
- **Graph Studio (`GraphPage.tsx`)**:
  - Added floating glass-surface toolbar supporting Force, Radial, and Grid layouts, zoom controls, filter toggles, live node/edge counters, minimap, and legend.
- **Search Page (`SearchPage.tsx`)**:
  - Standardized search bar and filter tabs using design system components and hybrid semantic + BM25 badges.
