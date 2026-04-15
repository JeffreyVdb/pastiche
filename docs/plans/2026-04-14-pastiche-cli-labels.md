# Plan: Pastiche CLI Label Management — Remaining Gaps

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

## Instructions for implementing agent

- Use toktoken MCP for code exploration. Reindex with `full: true` first.
- Follow existing code patterns — check adjacent files for style/structure.
- Run `pytest` after backend changes to confirm nothing breaks.
- After completing a task, commit with attribution: author "Reginald" <reginald@vandenborne.co>.

## Context

The Pastiche Labels MVP (backend + frontend) is fully implemented. The CLI (`cli/agent-harness/`) has partial label support: `labels list/create/delete`, `--labels` on `snippets create/update`. This plan closes the remaining CLI gaps.

## Decisions

| Decision | Choice |
|---|---|
| Update command shape | Single `labels update <id> --name X --color #Y` |
| REPL label support | Full parity: list, create, delete, attach, detach |
| Snippet display | `Labels:` line in detail view + `labels` column in list view |
| Filter syntax | `--labels bug,feature` and `--exclude-labels wip` — name-based, comma-separated |

## Gaps to Close

1. **`labels update` command** — rename/recolor via CLI
2. **`snippets list --labels/--exclude-labels`** — filter snippets by label name
3. **Label display in snippet output** — show labels in both detail and list views
4. **REPL label commands** — full parity with CLI

## Implementation Order

### Task 1: `labels update` command

**File:** `cli/agent-harness/cli_anything/pastiche/commands/labels.py`

Add after `delete` command:

```python
@labels.command("update")
@click.argument("label_id")
@click.option("--name", help="New label name")
@click.option("--color", help="New hex color (e.g. #ef4444)")
@click.pass_context
@handle_errors
@async_command
async def update(ctx: click.Context, label_id: str, name: str | None, color: str | None) -> None:
    if name is None and color is None:
        raise click.UsageError("Provide --name and/or --color")
    async with with_client(ctx) as client:
        payload = await client.update_label(label_id, name=name, color=color)
    if ctx.obj["json"]:
        print_json(payload)
        return
    click.echo(f"Updated label #{payload['name']} ({payload['color']})")
```

Client method `update_label` already exists in `core/client.py` — no changes needed there.

### Task 2: `snippets list` label filter flags

**File:** `cli/agent-harness/cli_anything/pastiche/commands/snippets.py`

Add two options to `list_snippets`:

```python
@click.option("--labels", help="Comma-separated label names to include")
@click.option("--exclude-labels", help="Comma-separated label names to exclude")
```

Update function signature to accept `labels: str | None` and `exclude_labels: str | None`.

Pass to `client.list_snippets`:

```python
labels=_parse_labels(labels),
exclude_labels=_parse_labels(exclude_labels),
```

`_parse_labels` helper already exists (line 11). Client `list_snippets` already accepts `labels` and `exclude_labels` params.

### Task 3: Show labels in snippet display

**File:** `cli/agent-harness/cli_anything/pastiche/core/output.py`

#### 3a: `print_snippet` — detail view

Add `Labels:` line after `Color:` line:

```python
labels_str = ", ".join(f"#{l['name']}" for l in snippet.get("labels", [])) or "none"
```

Insert in lines list:

```python
f"Labels: {labels_str}",
```

#### 3b: `print_snippet_list` — list view

Add `labels` column to table header and rows:

```python
print_table(
    ["id", "title", "language", "size", "short", "labels", "pinned", "public", "color", "updated"],
    [
        [
            item["id"],
            item["title"],
            item["language"],
            item.get("content_size", "-"),
            item.get("short_code", "-"),
            ", ".join(f"#{l['name']}" for l in item.get("labels", [])) or "-",
            "yes" if item.get("is_pinned") else "no",
            "yes" if item.get("is_public") else "no",
            item.get("color") or "none",
            item["updated_at"],
        ]
        for item in items
    ],
)
```

### Task 4: REPL label commands

**File:** `cli/agent-harness/cli_anything/pastiche/commands/repl.py`

Add 5 commands following existing REPL patterns:

```python
@repl_command("labels")
async def _repl_labels(ctx, args):
    async with with_client(ctx) as client:
        payload = await client.list_labels()
    if ctx.obj["json"]:
        print_json(payload)
    else:
        print_label_list(payload)

@repl_command("label-create")
async def _repl_label_create(ctx, args):
    name = args.strip()
    if not name:
        click.echo("Usage: label-create <name>")
        return
    async with with_client(ctx) as client:
        payload = await client.create_label(name)
    if ctx.obj["json"]:
        print_json(payload)
    else:
        click.echo(f"Created label #{payload['name']} ({payload['color']})")

@repl_command("label-delete")
async def _repl_label_delete(ctx, args):
    label_id = args.strip()
    if not label_id:
        click.echo("Usage: label-delete <label_id>")
        return
    async with with_client(ctx) as client:
        await client.delete_label(label_id)
    if ctx.obj["json"]:
        print_json({"deleted": True, "id": label_id})
    else:
        emit_success(f"Deleted label {label_id}")

@repl_command("label-attach")
async def _repl_label_attach(ctx, args):
    parts = args.split()
    if len(parts) != 2:
        click.echo("Usage: label-attach <snippet_id> <label_id>")
        return
    snippet_id, label_id = parts
    async with with_client(ctx) as client:
        await client.attach_label(label_id, snippet_id)
    if ctx.obj["json"]:
        print_json({"attached": True, "snippet_id": snippet_id, "label_id": label_id})
    else:
        emit_success(f"Attached label {label_id} to snippet {snippet_id}")

@repl_command("label-detach")
async def _repl_label_detach(ctx, args):
    parts = args.split()
    if len(parts) != 2:
        click.echo("Usage: label-detach <snippet_id> <label_id>")
        return
    snippet_id, label_id = parts
    async with with_client(ctx) as client:
        await client.detach_label(label_id, snippet_id)
    if ctx.obj["json"]:
        print_json({"detached": True, "snippet_id": snippet_id, "label_id": label_id})
    else:
        emit_success(f"Detached label {label_id} from snippet {snippet_id}")
```

Need to import `print_label_list` from output and check existing REPL command registration pattern.

### Task 5: Tests

**File:** `cli/agent-harness/cli_anything/pastiche/tests/test_full_e2e.py`

Add test cases:
- `test_labels_update` — create label, update name+color, verify
- `test_snippets_list_with_label_filter` — create snippet with label, list with `--labels`, verify filtered
- `test_snippet_get_shows_labels` — create snippet with label, get, verify labels in output
- `test_repl_labels` — test REPL label commands (if e2e test supports REPL)

## Files to Change

| File | Changes |
|---|---|
| `commands/labels.py` | Add `update` command |
| `commands/snippets.py` | Add `--labels`/`--exclude-labels` to `list` |
| `core/output.py` | Add labels to `print_snippet` and `print_snippet_list` |
| `commands/repl.py` | Add 5 label REPL commands |
| `tests/test_full_e2e.py` | Add test cases |
