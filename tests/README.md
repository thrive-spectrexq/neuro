# Neuro Testing Guide

This document explains the testing infrastructure and how to write and run tests for the Neuro project.

## Directory Structure

```
neuro/
  ├── apps/
  │   ├── desktop/
  │   │   ├── vitest.config.ts     # Desktop frontend test config
  │   │   └── src/__tests__/       # Desktop frontend tests & setup
  │   └── web/
  │       ├── vitest.config.ts     # Web frontend test config
  │       └── src/__tests__/       # Web frontend tests & setup
  ├── backend/
  │   └── tests/
  │       ├── conftest.py          # Pytest fixtures for backend tests
  │       ├── unit/                # Backend unit tests
  │       ├── integration/         # Backend integration tests
  │       └── e2e/                 # Backend end-to-end tests
  └── tests/
      └── README.md                # This guide
```

## Running Tests

### Frontend (Desktop & Web)

We use [Vitest](https://vitest.dev/) for frontend testing, along with React Testing Library.

**Desktop:**
```bash
cd apps/desktop
pnpm test          # Run tests once
pnpm test:watch    # Run tests in watch mode
pnpm test:coverage # Run tests with coverage
```

**Web:**
```bash
cd apps/web
pnpm test          # Run tests once
pnpm test:watch    # Run tests in watch mode
pnpm test:coverage # Run tests with coverage
```

### Backend

We use [Pytest](https://pytest.org/) for backend testing, with `pytest-asyncio` for async tests and `httpx` for API testing.

```bash
cd backend
pytest             # Run all tests
pytest tests/unit  # Run only unit tests
pytest tests/e2e   # Run only e2e tests
pytest --cov=app   # Run with coverage
```

## Coverage Targets

We aim for the following test coverage targets:
- Backend: 80%
- Frontend: 70% (focusing on complex hooks and components)
