# @neuro/ui

Shared React UI component library for the Neuro ecosystem (desktop application, web portal, and clipper extensions).

## Overview

`@neuro/ui` provides accessible, theme-consistent UI primitives designed with Tailwind CSS and Lucide icons.

## Installation

Within the monorepo workspace:

```json
{
  "dependencies": {
    "@neuro/ui": "workspace:*"
  }
}
```

## Available Primitives

- `Button` — Variants: `default`, `outline`, `ghost`, `destructive`
- `Input` / `Textarea` — Form control fields with validation styling
- `Card` — Container blocks with header, content, and footer slots
- `Badge` — Tags, status indicators, and pill labels
- `Modal` / `Dialog` — Accessible overlay dialogs with escape/backdrop dismiss
- `Dropdown` — Context menu and select menus
- `ThemeToggle` — Dark / Light / System theme switcher

## Development

```bash
# Typecheck
pnpm --filter @neuro/ui typecheck

# Build
pnpm --filter @neuro/ui build
```
