# @neuro/shared

Shared TypeScript data types, validation schemas, API constants, and cross-platform utility functions.

## Overview

This package contains universal types and helpers utilized by:
- `@neuro/desktop`
- `@neuro/web`
- `@neuro/clipper`
- `@neuro/sdk`

## Exported Modules

- `types/` — Note, Task, Tag, Project, Memory, and AI chat schemas matching backend contracts
- `constants/` — Default route paths, rate limit categories, and default configurations
- `utils/` — Markdown formatting helpers, date string parsers, debounce/throttle utilities

## Usage

```typescript
import { Note, Task, MemoryType } from '@neuro/shared';
```

## Scripts

```bash
pnpm --filter @neuro/shared typecheck
pnpm --filter @neuro/shared build
```
