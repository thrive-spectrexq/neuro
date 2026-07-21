# Workflow & Automation Engine Architecture

Neuro features a declarative, event-driven automation engine that enables users to trigger automated workflows whenever state changes occur within their knowledge base.

---

## Automation Execution Flow

```
┌─────────────────┐       Event Emitted       ┌────────────────────────┐
│ State Mutation  ├──────────────────────────►│    AutomationEngine    │
│ (e.g. Note Add) │                           └───────────┬────────────┘
└─────────────────┘                                       │
                                                          ▼
                                              ┌────────────────────────┐
                                              │ Query Active Rules for │
                                              │ Trigger Type           │
                                              └───────────┬────────────┘
                                                          │
                                                          ▼
                                              ┌────────────────────────┐
                                              │  Evaluate Conditions   │
                                              │  (Key-value matching)  │
                                              └───────────┬────────────┘
                                                          │
                                         ┌────────────────┴────────────────┐
                                         │ Match = True                    │ Match = False
                                         ▼                                 ▼
                             ┌───────────────────────┐            ┌─────────────────┐
                             │ Execute Workflow      │            │ Ignore Trigger  │
                             │ Actions               │            └─────────────────┘
                             └───────────┬───────────┘
                                         │
                   ┌─────────────────────┼─────────────────────┐
                   ▼                     ▼                     ▼
         ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
         │ Webhook Action    │ │ Auto Summarize    │ │ Entity Extraction │
         │ (HTTP POST Payload│ │ (AI Service)      │ │ (Celery Task)     │
         └───────────────────┘ └───────────────────┘ └───────────────────┘
```

---

## Trigger Types

- `on_note_created`: Fired immediately after a new note is persisted.
- `on_note_updated`: Fired when a note title or content is modified.
- `on_tag_added`: Fired when a tag is attached to a note.
- `on_task_completed`: Fired when a task status transitions to `done`.

---

## Condition Evaluation

Rule conditions are stored as JSON dictionaries in `AutomationRule.conditions`:

```json
{
  "tag": "research",
  "project_id": "8f3b2a19-4081-43e5-829d-649065a7e6b0"
}
```

The `AutomationEngine._evaluate_conditions()` method checks that every key-value pair matches the event payload.

---

## Actions Engine

Supported actions include:

1. **`webhook`**: Sends HTTP POST requests to specified URLs with the event context payload.
2. **`auto_summarize`**: Invokes the AI service to append a summary header to the target note.
3. **`categorize`**: Applies tags or assigns the note to a specific project.
4. **`extract_entities`**: Dispatches a background task (`extract_entities_task.delay(note_id)`) to parse and link entities.
