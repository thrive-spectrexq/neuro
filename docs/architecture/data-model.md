# Neuro Data Model & Schema Reference

Neuro models its data using **SQLModel** (Pydantic v2 + SQLAlchemy 2.0). All primary entity IDs use `UUIDv4`.

---

## Entity Relationship Diagram

```
┌──────────────┐       1:N       ┌──────────────┐       1:N       ┌──────────────┐
│     User     ├────────────────►│   Project    ├────────────────►│     Task     │
└──────┬───────┘                 └──────┬───────┘                 └──────────────┘
       │                                │
       │ 1:N                            │ 1:N
       ▼                                ▼
┌──────────────┐                 ┌──────────────┐                 ┌──────────────┐
│     Note     │◄────────────────┤   Comment    │                 │NoteLink (M:N)│
└──────┬───────┘ 1:N             └──────────────┘                 └──────────────┘
       │
       ├─────────────────────────────────────────────────────────►┌──────────────┐
       │ NoteTag (M:N)                                            │     Tag      │
       ▼                                                          └──────────────┘
┌──────────────┐
│AutomationRule│
└──────────────┘
```

---

## Model Specifications

### 1. User (`app.models.user`)
Stores user identity, credentials, and authentication state.
- `id`: `UUID` (Primary Key)
- `email`: `str` (Unique, indexed)
- `hashed_password`: `str`
- `full_name`: `Optional[str]`
- `is_active`: `bool` (default: `True`)
- `created_at`: `datetime`

### 2. Note (`app.models.note`)
The core knowledge unit in Neuro.
- `id`: `UUID` (Primary Key)
- `title`: `str`
- `content`: `str`
- `content_type`: `ContentType` (`markdown` | `richtext`)
- `is_archived`: `bool` (default: `False`)
- `is_pinned`: `bool` (default: `False`)
- `parent_id`: `Optional[UUID]` (Foreign Key -> `Note.id` for hierarchical notes)
- `project_id`: `Optional[UUID]` (Foreign Key -> `Project.id`)
- `user_id`: `UUID` (Foreign Key -> `User.id`)
- `created_at`: `datetime`
- `updated_at`: `datetime`

### 3. NoteLink (`app.models.note`)
Represents directional bi-directional graph edges between notes.
- `source_id`: `UUID` (Primary Key, Foreign Key -> `Note.id`)
- `target_id`: `UUID` (Primary Key, Foreign Key -> `Note.id`)

### 4. Project & ProjectMember (`app.models.project`)
Represents project workspaces and team access controls.
- **Project**:
  - `id`: `UUID` (Primary Key)
  - `name`: `str`
  - `description`: `Optional[str]`
  - `color`: `Optional[str]`
  - `icon`: `Optional[str]`
  - `owner_id`: `UUID` (Foreign Key -> `User.id`)
  - `created_at`: `datetime`
  - `updated_at`: `datetime`
- **ProjectMember**:
  - `project_id`: `UUID` (Primary Key, Foreign Key -> `Project.id`)
  - `user_id`: `UUID` (Primary Key, Foreign Key -> `User.id`)
  - `role`: `Role` (`owner` | `editor` | `viewer`)

### 5. Task (`app.models.task`)
Task items linked to projects or standalone workflows.
- `id`: `UUID` (Primary Key)
- `title`: `str`
- `description`: `Optional[str]`
- `status`: `str` (`todo` | `in_progress` | `done`)
- `priority`: `Optional[str]` (`low` | `medium` | `high`)
- `due_date`: `Optional[datetime]`
- `project_id`: `Optional[UUID]` (Foreign Key -> `Project.id`)
- `created_at`: `datetime`
- `updated_at`: `datetime`

### 6. Tag & NoteTag (`app.models.tag`)
Categorization taxonomy.
- **Tag**: `id` (`UUID`), `name` (`str`, unique)
- **NoteTag**: `note_id` (`UUID`), `tag_id` (`UUID`)

### 7. AutomationRule (`app.models.automation`)
Trigger-condition-action rule definition.
- `id`: `UUID` (Primary Key)
- `name`: `str`
- `description`: `Optional[str]`
- `trigger_type`: `str` (e.g., `on_note_created`, `on_tag_added`)
- `conditions`: `JSON` (dictionary of match criteria)
- `actions`: `JSON` (list of action payloads)
- `is_active`: `bool`
- `created_at`: `datetime`
- `updated_at`: `datetime`

### 8. Comment (`app.models.comment`)
Inline annotations and discussion items.
- `id`: `UUID` (Primary Key)
- `note_id`: `UUID` (Foreign Key -> `Note.id`)
- `author_id`: `UUID` (Foreign Key -> `User.id`)
- `content`: `str`
- `is_resolved`: `bool`
- `created_at`: `datetime`
- `updated_at`: `datetime`

### 9. SyncBlob (`app.models.sync`)
Encrypted blobs for zero-knowledge cross-device sync.
- `id`: `UUID` (Primary Key)
- `user_id`: `UUID` (Foreign Key -> `User.id`)
- `blob_data`: `bytes` / `str`
- `checksum`: `str`
- `created_at`: `datetime`

### 10. AuditLog (`app.models.audit`)
System activity logging for compliance and activity tracking.
- `id`: `UUID` (Primary Key)
- `action`: `str`
- `entity_type`: `str`
- `entity_id`: `UUID`
- `user_id`: `UUID`
- `details`: `JSON`
- `timestamp`: `datetime`
