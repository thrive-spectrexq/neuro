# Neuro Architecture Overview

Neuro is a local-first AI second brain application built with a modern, full-stack architecture.

## Tech Stack
- **Backend**: Python, FastAPI, SQLModel, Celery, Redis, ChromaDB
- **Frontend**: TypeScript, React, Electron, Tailwind CSS, Zustand
- **Storage**: SQLite/PostgreSQL, ChromaDB for vectors

## Core Components
- **API Server**: Handles requests, auth, and business logic.
- **Worker**: Processes background tasks like document embedding.
- **Client**: Desktop app via Electron and React.
