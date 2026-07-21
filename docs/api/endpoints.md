# Neuro API Endpoints Documentation

This document describes the 14 core API subsystems of the Neuro backend. All API endpoints are prefixed with `/api/v1`.

## 1. Auth & Identity (`/api/v1/auth`)
Manages user registration, login, and authentication.

- **POST /api/v1/auth/register**
  - **Description**: Register a new user.
  - **Request Body**: `{"email": "user@example.com", "username": "user", "password": "password"}`
  - **Response**: `{"id": "uuid", "email": "user@example.com", "username": "user", "is_active": true, "created_at": "timestamp"}`
  - **Auth**: None

- **POST /api/v1/auth/login**
  - **Description**: Authenticate a user and receive a JWT.
  - **Request Body**: `{"username": "user", "password": "password"}` (form data)
  - **Response**: `{"access_token": "jwt_token_string", "token_type": "bearer"}`
  - **Auth**: None

## 2. Notes Management (`/api/v1/notes`)
CRUD operations for notes, including tagging and linking.

- **GET /api/v1/notes**
  - **Description**: List all notes with optional pagination.
  - **Response**: `{"items": [{"id": "uuid", "title": "Note", "content": "..."}], "total": 1, "page": 1, "size": 20}`
  - **Auth**: Required

- **POST /api/v1/notes**
  - **Description**: Create a new note.
  - **Request Body**: `{"title": "Note Title", "content": "Content", "tags": ["tag1"]}`
  - **Response**: `{"id": "uuid", "title": "...", "content": "...", "tags": ["tag1"], "forward_links": [], "backlinks": []}`
  - **Auth**: Required

- **GET /api/v1/notes/{id}**
  - **Description**: Retrieve a specific note by ID.
  - **Response**: Note object with tags and links.
  - **Auth**: Required

- **PUT /api/v1/notes/{id}**
  - **Description**: Update an existing note.
  - **Request Body**: `{"title": "New Title", "content": "Updated content"}`
  - **Response**: Updated Note object.
  - **Auth**: Required

- **DELETE /api/v1/notes/{id}**
  - **Description**: Delete a note.
  - **Response**: `204 No Content`
  - **Auth**: Required

## 3. Projects & Workspaces (`/api/v1/projects`)
Organize notes, tasks, and users into collaborative workspaces.

- **GET /api/v1/projects**
  - **Description**: List user's projects.
  - **Response**: `[{"id": "uuid", "name": "Project", "description": "..."}]`
  - **Auth**: Required

- **POST /api/v1/projects**
  - **Description**: Create a new project.
  - **Request Body**: `{"name": "Project Name", "description": "Optional info"}`
  - **Response**: Created Project object.
  - **Auth**: Required

- **GET /api/v1/projects/{id}**
  - **Description**: Retrieve a specific project.
  - **Response**: Project object.
  - **Auth**: Required

- **PUT /api/v1/projects/{id}**
  - **Description**: Update a project.
  - **Request Body**: `{"name": "Updated Name"}`
  - **Response**: Updated Project object.
  - **Auth**: Required

- **DELETE /api/v1/projects/{id}**
  - **Description**: Delete a project.
  - **Response**: `204 No Content`
  - **Auth**: Required

- **POST /api/v1/projects/{id}/members**
  - **Description**: Add a member to a project.
  - **Request Body**: `{"user_id": "uuid", "role": "editor"}`
  - **Response**: Project Member relation object.
  - **Auth**: Required

- **DELETE /api/v1/projects/{id}/members/{user_id}**
  - **Description**: Remove a member from a project.
  - **Response**: `204 No Content`
  - **Auth**: Required

## 4. Tasks & Workflows (`/api/v1/tasks`)
Manage tasks, statuses, and deadlines.

- **GET /api/v1/tasks**
  - **Description**: List tasks.
  - **Response**: `[{"id": "uuid", "title": "Task", "status": "todo"}]`
  - **Auth**: Required

- **POST /api/v1/tasks**
  - **Description**: Create a task.
  - **Request Body**: `{"title": "Task title", "description": "...", "status": "todo", "due_date": "2024-12-31T23:59:59Z"}`
  - **Response**: Created Task object.
  - **Auth**: Required

- **GET /api/v1/tasks/{id}**
  - **Description**: Retrieve a task.
  - **Response**: Task object.
  - **Auth**: Required

- **PUT /api/v1/tasks/{id}**
  - **Description**: Update a task.
  - **Request Body**: `{"status": "in_progress"}`
  - **Response**: Updated Task object.
  - **Auth**: Required

- **DELETE /api/v1/tasks/{id}**
  - **Description**: Delete a task.
  - **Response**: `204 No Content`
  - **Auth**: Required

## 5. Taxonomy & Tags (`/api/v1/tags`)
Global tagging system for cross-referencing.

- **GET /api/v1/tags**
  - **Description**: List all tags.
  - **Response**: `[{"id": "uuid", "name": "tag1", "color": "#000000"}]`
  - **Auth**: Required

- **POST /api/v1/tags**
  - **Description**: Create a tag.
  - **Request Body**: `{"name": "tag2", "color": "#ff0000"}`
  - **Response**: Created Tag object.
  - **Auth**: Required

- **DELETE /api/v1/tags/{id}**
  - **Description**: Delete a tag.
  - **Response**: `204 No Content`
  - **Auth**: Required

## 6. Comments & Discussion (`/api/v1/comments`)
Interact and discuss on notes/tasks.

- **GET /api/v1/notes/{id}/comments**
  - **Description**: Get comments for a specific note.
  - **Response**: `[{"id": "uuid", "content": "Great note!", "user_id": "uuid", "created_at": "..."}]`
  - **Auth**: Required

- **POST /api/v1/notes/{id}/comments**
  - **Description**: Add a comment to a note.
  - **Request Body**: `{"content": "Looks good."}`
  - **Response**: Created Comment object.
  - **Auth**: Required

## 7. Search & Retrieval (`/api/v1/search`)
Full-text search and semantic retrieval across the knowledge base.

- **GET /api/v1/search**
  - **Description**: Search for notes, projects, and tasks.
  - **Query Parameters**: `?q=query_string`
  - **Response**: `{"results": [{"id": "uuid", "type": "note", "title": "Match", "snippet": "..."}]}`
  - **Auth**: Required

## 8. AI Chat & Tools (`/api/v1/ai`)
Interact with AI models for summarization, chat, and generation.

- **POST /api/v1/ai/chat**
  - **Description**: Send a message to the AI assistant.
  - **Request Body**: `{"message": "Summarize my recent notes", "context_ids": ["uuid"]}`
  - **Response**: `{"response": "Here is your summary...", "tokens_used": 150}`
  - **Auth**: Required

- **POST /api/v1/ai/summarize**
  - **Description**: Summarize a specific text or note.
  - **Request Body**: `{"text": "Long text..."}`
  - **Response**: `{"summary": "Short text."}`
  - **Auth**: Required

## 9. Automations Engine (`/api/v1/automations`)
Define and trigger rule-based workflows.

- **GET /api/v1/automations**
  - **Description**: List user-defined automations.
  - **Response**: `[{"id": "uuid", "trigger": "note_created", "action": "add_tag"}]`
  - **Auth**: Required

- **POST /api/v1/automations**
  - **Description**: Create an automation rule.
  - **Request Body**: `{"trigger": "task_completed", "action": "notify_user", "conditions": {}}`
  - **Response**: Created Automation object.
  - **Auth**: Required

## 10. Analytics & Monitoring (`/api/v1/analytics`)
Insights into workspace usage and system metrics.

- **GET /api/v1/analytics/stats**
  - **Description**: Retrieve global workspace statistics.
  - **Response**: `{"total_notes": 42, "total_projects": 3, "total_tasks": 10}`
  - **Auth**: Required

- **GET /api/v1/analytics/activity**
  - **Description**: Retrieve a timeline of recent activities.
  - **Response**: `[{"action": "NOTE_CREATED", "timestamp": "...", "details": {}}]`
  - **Auth**: Required

## 11. Ingestion & Parsing (`/api/v1/ingest`)
Import external data formats into the Neuro ecosystem.

- **POST /api/v1/ingest/markdown**
  - **Description**: Upload a markdown file to convert into a note.
  - **Request Body**: `multipart/form-data` with file.
  - **Response**: Created Note object.
  - **Auth**: Required

## 12. Knowledge Graph (`/api/v1/graph`)
Visualize the connections between notes and entities.

- **GET /api/v1/graph**
  - **Description**: Retrieve graph nodes and edges for visualization.
  - **Response**: `{"nodes": [{"id": "uuid", "label": "Note A"}], "edges": [{"source": "uuid1", "target": "uuid2"}]}`
  - **Auth**: Required

## 13. Sync Engine (`/api/v1/sync`)
Synchronize data across offline clients and the server.

- **POST /api/v1/sync/push**
  - **Description**: Push local changes to the server.
  - **Request Body**: `{"changes": [...]}`
  - **Response**: `{"status": "success", "conflicts": []}`
  - **Auth**: Required

- **GET /api/v1/sync/pull**
  - **Description**: Pull updates since last sync timestamp.
  - **Query Parameters**: `?since=timestamp`
  - **Response**: `{"updates": [...]}`
  - **Auth**: Required

## 14. Voice Streaming (`/api/v1/voice`)
Process voice inputs for transcription and commands.

- **POST /api/v1/voice/transcribe**
  - **Description**: Upload audio for transcription.
  - **Request Body**: `multipart/form-data` with audio file.
  - **Response**: `{"text": "Transcribed speech."}`
  - **Auth**: Required

- **WebSocket /api/v1/voice/stream**
  - **Description**: Real-time voice streaming for live transcription.
  - **Auth**: Token required in connection request.
