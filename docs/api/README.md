# Neuro API Reference Overview

The Neuro backend exposes a versioned RESTful API built with **FastAPI** and **Pydantic v2**.

- **Base Path**: `/api/v1`
- **Interactive Documentation**:
  - Swagger UI: `http://localhost:8000/docs`
  - ReDoc: `http://localhost:8000/redoc`
  - OpenAPI Spec: `http://localhost:8000/openapi.json`

---

## Authentication

All endpoints (except `/api/v1/auth/login`, `/api/v1/auth/register`, and `/health`) require an HTTP `Authorization` header containing a valid Bearer JWT:

```http
Authorization: Bearer <jwt_access_token>
```

---

## Standard Error Response Format

HTTP error responses return standard JSON objects with error details:

```json
{
  "detail": "Resource not found"
}
```

Common status codes:
- `200 OK`: Successful operation
- `201 Created`: Resource successfully created
- `204 No Content`: Successful deletion
- `400 Bad Request`: Validation error or invalid payload
- `401 Unauthorized`: Missing or expired Bearer token
- `403 Forbidden`: Insufficient permissions for resource
- `404 Not Found`: Target entity does not exist

---

## API Subsystem Index

See [endpoints.md](endpoints.md) for full parameters and response schemas across all modules:

1. **Auth & Identity**: `/api/v1/auth`
2. **Notes Management**: `/api/v1/notes`
3. **Projects & Workspaces**: `/api/v1/projects`
4. **Tasks & Workflows**: `/api/v1/tasks`
5. **Taxonomy & Tags**: `/api/v1/tags`
6. **Comments & Discussion**: `/api/v1/comments`
7. **Search & Retrieval**: `/api/v1/search`
8. **AI Chat & Tools**: `/api/v1/ai`
9. **Automations Engine**: `/api/v1/automations`
10. **Analytics & Monitoring**: `/api/v1/analytics`
11. **Ingestion & Parsing**: `/api/v1/ingest`
12. **Knowledge Graph**: `/api/v1/graph`
13. **Sync Engine**: `/api/v1/sync`
14. **Voice Streaming**: `/api/v1/voice`
