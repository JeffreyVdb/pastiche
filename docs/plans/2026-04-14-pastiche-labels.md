# Plan: Pastiche Labels MVP

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

## Instructions for implementing agent

- Use toktoken MCP for code exploration. Reindex with `full: true` first.
- Load the frontend-skill for any UI design changes.
- For visual changes in the frontend, use agent-browser skill to verify.
- Write unit tests if applicable.
- Follow existing code patterns — check adjacent files for style/structure.
- Run `pytest` after backend changes to confirm nothing breaks.
- After completing a task, commit with attribution: author "Reginald" <reginald@vandenborne.co>.

## Summary

Introduce a user-scoped labeling system for Pastiche. Labels are colored tags that users attach to snippets for organization and filtering. MVP covers: label CRUD in Settings, label assignment on snippets, label display on cards, and label filtering in search.

## Decisions

| Decision | Choice |
|---|---|
| Label colors | Free-form hex, managed in Settings |
| New label color | Random auto-assigned |
| Snippet colors | Stay in card context menu (5 fixed colors) |
| Label display on card | Between title row and size/date row, as colored `#label` chips |
| Label picker on card | Context menu below color picker, checkbox list |
| Label filtering | `#label`, `!#label`, `-#label` tokens in search bar |
| API shape | Separate `/api/labels` CRUD endpoints |
| Delete behavior | Cascade — remove label from all snippets |
| Label constraints | Max 50 chars, free-form Unicode, unique per user (case-insensitive) |
| API responses | `labels: LabelRead[]` embedded on `SnippetListRead` and `SnippetRead` |

## Architecture

### Database

New table `labels`:
- `id` UUID PK (gen_random_uuid)
- `user_id` UUID FK → users, indexed
- `name` VARCHAR(50), not null
- `color` VARCHAR(7), not null (hex like `#ef4444`)
- `created_at` TIMESTAMP

Unique constraint on `(user_id, lower(name))`.

New junction table `snippet_labels`:
- `snippet_id` UUID FK → snippets, on delete cascade
- `label_id` UUID FK → labels, on delete cascade
- Primary key: `(snippet_id, label_id)`

### Backend Models (SQLModel)

```
# Label model
class Label(SQLModel, table=True):
    __tablename__ = "labels"
    id: UUID
    user_id: UUID (FK users.id, indexed)
    name: str (max 50)
    color: str (max 7)
    created_at: datetime

class LabelCreate(SQLModel):
    name: str (min 1, max 50)

class LabelUpdate(SQLModel):
    name: str | None (min 1, max 50)
    color: str | None (hex pattern)

class LabelRead(SQLModel):
    id: UUID
    name: str
    color: str
```

### API Endpoints

`/api/labels`:
- `GET /api/labels` → `LabelRead[]` — list all labels for current user
- `POST /api/labels` → `LabelRead` — create label (name required, color auto-random hex)
- `PATCH /api/labels/{label_id}` → `LabelRead` — update name and/or color
- `DELETE /api/labels/{label_id}` → 204 — delete label, cascade remove from all snippets
- `PUT /api/labels/{label_id}/snippets/{snippet_id}` → 204 — attach label to snippet
- `DELETE /api/labels/{label_id}/snippets/{snippet_id}` → 204 — detach label from snippet

### Service Layer

New file: `backend/app/services/label_service.py`
- `create_label(session, user_id, name)` — auto-generate random hex color
- `update_label(session, label_id, name=None, color=None)`
- `delete_label(session, label_id)` — cascade delete from snippet_labels
- `list_labels(session, user_id)` → `list[LabelRead]`
- `attach_label(session, snippet_id, label_id)` — upsert into snippet_labels
- `detach_label(session, snippet_id, label_id)` — delete from snippet_labels
- `get_snippet_labels(session, snippet_id)` → `list[LabelRead]`

### Frontend Changes

#### Types (`frontend/src/types/snippet.ts`)
- Add `LabelRead` interface: `{ id: string; name: string; color: string }`
- Add `labels: LabelRead[]` to `SnippetListItem` and `Snippet`

#### Settings Page (`frontend/src/pages/Settings.tsx`)
New section "Labels" between Typography and API Keys:
- List of existing labels as rows: colored circle + name + hex display + rename input + color hex input + delete button
- "Add label" form: text input + "Add" button
- Inline rename: click name to edit
- Inline color: hex text input (validated `#rrggbb`)
- Delete with ConfirmDialog (same pattern as API keys)

#### Snippet Card (`frontend/src/components/snippets/SnippetCard.tsx`)
- Below header row, above size/date: render label chips as `#labelname` with the label's color as background
- Label chip style: small pill, `background: color + 18% opacity`, `color: color`, `border: 1px solid color + 40%`
- Context menu: add `LabelPickerRow` below `ColorPickerRow` — checkbox list of all user labels
- New prop: `onToggleLabel: (snippetId: string, labelId: string) => void`

#### Home Page (`frontend/src/pages/Home.tsx`)
- `handleToggleLabel` function — calls PUT/DELETE on `/api/labels/{labelId}/snippets/{snippetId}`
- Pass `onToggleLabel` to `SnippetCard`

#### Search (`frontend/src/lib/snippet-search.ts`, `backend`)
- Frontend: parse `#label`, `!#label`, `-#label` tokens from search query, send as separate `labels` / `exclude_labels` query params
- Backend `list_snippets_by_user`: accept `labels: list[str]` and `exclude_labels: list[str]` params
- Join on snippet_labels + labels, filter by label name
- Combine with existing text search (AND logic)

#### API client (`frontend/src/lib/api.ts`)
No changes — existing `api.get/post/patch/delete` covers all label endpoints.

#### SnippetCard context menu
Add `LabelPickerRow` component:
- Shows all user labels with checkboxes
- Checked = label attached to snippet
- Toggle calls `onToggleLabel`
- "Labels" section header with subtle styling

### CLI (`cli/agent-harness/cli_anything/pastiche/`)
- Add `labels` command group: `list`, `create`, `delete`
- Add `--labels` flag to `snippets create` and `snippets update`

## Implementation Order

1. **Alembic migration** — create `labels` and `snippet_labels` tables
2. **Backend models** — `Label`, `LabelCreate`, `LabelUpdate`, `LabelRead` in `models/`
3. **Backend service** — `label_service.py` with all CRUD + attach/detach
4. **Backend routes** — `routes/labels.py`, register in router
5. **Backend: embed labels in snippet responses** — update `snippet_service.list_snippets_by_user` and `snippet_service.get_snippet_by_id` to join labels
6. **Backend: search filtering** — add `labels`/`exclude_labels` params to `list_snippets_by_user`
7. **Frontend types** — add `LabelRead`, update `SnippetListItem` and `Snippet`
8. **Frontend: Settings labels section** — label CRUD UI
9. **Frontend: SnippetCard label chips** — display + context menu picker
10. **Frontend: Home page** — wire `onToggleLabel` handler
11. **Frontend: search filtering** — parse `#label` tokens, send filter params
12. **CLI: labels commands** — add label management to CLI

## Task Breakdown

### Task 1: Alembic Migration
Create `alembic/versions/0010_create_labels.py`:
- Create `labels` table with columns: id (UUID PK), user_id (UUID FK users), name (VARCHAR 50), color (VARCHAR 7), created_at (TIMESTAMP)
- Create index on `labels.user_id`
- Create unique index on `(user_id, lower(name))`
- Create `snippet_labels` table: snippet_id (UUID FK snippets cascade), label_id (UUID FK labels cascade), PK (snippet_id, label_id)
- Run migration

### Task 2: Backend Models
Create `backend/app/models/label.py`:
- `Label` (table model)
- `LabelCreate` (name: str, min 1, max 50)
- `LabelUpdate` (name: str | None, color: str | None)
- `LabelRead` (id, name, color)
- Update `Label` import in `backend/app/models/__init__.py`
- Add `labels: list[LabelRead]` to `SnippetListRead` and `SnippetRead`

### Task 3: Backend Service
Create `backend/app/services/label_service.py`:
- `create_label` — generate random hex color, check name uniqueness per user
- `update_label` — update name/color, check name uniqueness
- `delete_label` — delete label, cascade handles snippet_labels
- `list_labels` — return all labels for user
- `attach_label` — upsert into snippet_labels
- `detach_label` — delete from snippet_labels
- `get_snippet_labels` — return labels for a snippet

### Task 4: Backend Routes
Create `backend/app/api/routes/labels.py`:
- All 6 endpoints as specified above
- Register in `backend/app/api/router.py`

### Task 5: Embed Labels in Snippet Responses
Update `backend/app/services/snippet_service.py`:
- `list_snippets_by_user`: join snippet_labels + labels, aggregate labels per snippet
- `get_snippet_by_id`: fetch associated labels
- `create_snippet`: return with empty labels list
- Ensure `SnippetRead` and `SnippetListRead` include labels field

### Task 6: Search Label Filtering
Update `backend/app/api/routes/snippets.py` and `backend/app/services/snippet_service.py`:
- Add `labels: list[str] = Query(default=[])` and `exclude_labels: list[str] = Query(default=[])` params to `list_mine`
- In `list_snippets_by_user`, join on snippet_labels + labels
- Include filter: all `labels` names must be present (AND)
- Exclude filter: none of `exclude_labels` names present (NOT IN)
- Existing text search remains (AND with label filters)

### Task 7: Frontend Types
Update `frontend/src/types/snippet.ts`:
- Add `LabelRead` interface
- Add `labels: LabelRead[]` to `SnippetListItem` and `Snippet`

### Task 8: Settings Labels Section
Update `frontend/src/pages/Settings.tsx`:
- New state: `labels: LabelRead[]`, loading state
- Fetch labels on mount: `GET /api/labels`
- Section header: `// labels` + "Labels"
- Label rows: colored dot + name (editable inline) + hex input + delete button
- Add form: text input + "Add" button
- Rename: inline edit with save on blur/enter
- Color: hex text input with validation, save on blur/enter
- Delete: ConfirmDialog pattern
- Place between Typography and API Keys sections

### Task 9: SnippetCard Label Chips
Update `frontend/src/components/snippets/SnippetCard.tsx`:
- Add `onToggleLabel` prop
- Render label chips below header row, before metadata line
- Chip style: pill shape, label color as tinted background, `#name` text
- Add `LabelPickerRow` to context menu below `ColorPickerRow`
- Create `frontend/src/components/ui/LabelPickerRow.tsx`:
  - Takes `labels: LabelRead[]`, `selectedIds: Set<string>`, `onToggle: (labelId: string) => void`
  - Renders checkbox list of all user labels
  - Section header "labels" style

### Task 10: Home Page Wiring
Update `frontend/src/pages/Home.tsx`:
- Add `allLabels` state — fetch on mount via `GET /api/labels`
- Add `handleToggleLabel(id, labelId)` — PUT/DELETE on `/api/labels/{labelId}/snippets/{id}`
- Optimistic update: add/remove label from snippet in pinned and regular lists
- Pass `allLabels` and `onToggleLabel` to `SnippetCard`

### Task 11: Search Label Filtering
Update `frontend/src/lib/snippet-search.ts`:
- Parse search tokens: extract `#label` → include, `!#label` / `-#label` → exclude
- Return `{ textQuery, includeLabels, excludeLabels }`
- Update `frontend/src/pages/Home.tsx` fetchListPage to pass `labels` and `exclude_labels` as query params

### Task 12: CLI Labels
Update `cli/agent-harness/cli_anything/pastiche/`:
- Add `labels` command group: `list`, `create <name>`, `delete <label_id>`
- Add `--labels` flag to `snippets create` and `snippets update` (comma-separated label names)
- On create snippet with `--labels`: create labels if they don't exist, then attach

## Random Hex Color Generation

Use Python `random` module:
```python
import random
def random_hex_color() -> str:
    return f"#{random.randint(0, 0xFFFFFF):06x}"
```

Frontend equivalent for Settings add flow (though server generates on POST).
