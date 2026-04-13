# Plan: CLI-Anything Harness for Pastiche

## Context

Pastiche is a code snippets platform (FastAPI backend + React frontend) with a REST API. There is no existing CLI. This plan creates an agent-native CLI following the CLI-Anything methodology so that AI agents (and humans) can manage snippets from the terminal.

**Target software:** Pastiche (REST API-based web application)
**Harness location:** `cli/agent-harness/`
**Backend strategy:** REST API via httpx against a running Pastiche instance
**Auth:** Config file (`~/.pastiche/config.toml`) + env vars (`PASTICHE_API_KEY`, `PASTICHE_URL`) + CLI flags (priority: flag > env > config)

---

## Decisions (resolved)

| Decision | Choice | Rationale |
|---|---|---|
| Harness location | `cli/agent-harness/` | Cleaner repo layout vs `agent-harness/` at root |
| Backend strategy | REST API via httpx | Works against any running Pastiche instance; no import coupling |
| Auth config | Config file + env vars + flags | Maximum flexibility for agents (env), humans (config), scripts (flags) |
| Login command | Skip for v1 | Manual config/env sufficient; can add `pastiche login` later |
| REPL | Yes, as default | CLI-Anything requires REPL when no subcommand given |

---

## Implementation Plan

### Phase 1: Scaffold (files + packaging)

Create the CLI-Anything directory structure under `cli/agent-harness/`:

```
cli/agent-harness/
├── pastiche.md                  # CLI description for CLI-Hub
├── setup.py                     # Installable package
└── cli_anything/
    └── pastiche/
        ├── README.md            # Usage docs
        ├── __init__.py
        ├── __main__.py          # Entry: python -m cli_anything.pastiche
        ├── pastiche_cli.py      # Click root group
        ├── core/
        │   ├── __init__.py
        │   ├── config.py        # Config loading (file + env + flags)
        │   ├── client.py        # httpx REST client wrapper
        │   └── output.py        # Human table + JSON output helpers
        ├── commands/
        │   ├── __init__.py
        │   ├── snippets.py      # Snippet CRUD commands
        │   ├── keys.py          # API key management commands
        │   ├── whoami.py        # Current user / auth check
        │   └── repl.py          # Interactive REPL
        └── tests/
            ├── __init__.py
            ├── TEST.md          # Test plan
            ├── test_core.py     # Unit tests (config, client, output)
            └── test_full_e2e.py # E2E tests against running API
```

**Tasks:**
- [ ] Create directory structure
- [ ] Write `setup.py` with `find_namespace_packages(include=["cli_anything.*"])`, `console_scripts` entry point `cli-anything-pastiche`
- [ ] Write `__main__.py` to delegate to `pastiche_cli:cli`
- [ ] Write `pastiche.md` (one-liner description for CLI-Hub)

### Phase 2: Core Module

#### `core/config.py`
- Load config priority: CLI flags > env vars (`PASTICHE_API_KEY`, `PASTICHE_URL`) > `~/.pastiche/config.toml`
- Config file format: TOML with `[server] url = ...` and `[auth] api_key = ...`
- Create `~/.pastiche/` dir with `0700` permissions if missing
- Config file `0600` permissions
- Dataclass `PasticheConfig` with `url: str`, `api_key: str`
- Raise clear error if no URL or API key found

#### `core/client.py`
- `PasticheClient` class wrapping `httpx.AsyncClient`
- Base URL from config, auth header `Authorization: Bearer {api_key}`
- Methods mapping to REST endpoints:
  - `create_snippet(title, language, content) -> SnippetRead`
  - `list_snippets(sort_by, order, q, limit, offset, pinned) -> list[SnippetListItem]`
  - `get_snippet(snippet_id) -> SnippetRead`
  - `update_snippet(snippet_id, title, language, content, color) -> SnippetRead`
  - `delete_snippet(snippet_id) -> None`
  - `toggle_pin(snippet_id) -> SnippetRead`
  - `toggle_visibility(snippet_id) -> SnippetRead`
  - `resolve_short_code(code) -> SnippetRead`
  - `create_api_key(name) -> ApiKeyCreated`
  - `list_api_keys(limit, offset) -> list[ApiKeyRead]`
  - `delete_api_key(key_id) -> None`
  - `get_me() -> UserRead`
- Error handling: raise `PasticheError(status, detail)` on non-2xx
- JSON output mode: `--json` flag dumps raw response

#### `core/output.py`
- `print_table(headers, rows)` — formatted table for human use
- `print_json(data)` — `json.dumps` with `indent=2`
- `print_snippet(s)` — pretty-print one snippet (title, language, created, pinned, color)
- `print_snippet_list(items)` — table of snippets
- Support `--json` global flag (Click context setting) that switches all output to JSON

### Phase 3: Commands

#### `commands/snippets.py` — Command group `snippets`

| Command | REST Endpoint | Key Args |
|---|---|---|
| `create` | `POST /api/snippets/` | `--title`, `--language` (default: autodetect), `--content` or stdin |
| `list` | `GET /api/snippets/` | `--query`/`-q`, `--sort` (created_at/updated_at), `--order` (asc/desc), `--limit`, `--offset`, `--pinned` |
| `get` | `GET /api/snippets/{id}` | `SNIPPET_ID` arg |
| `update` | `PATCH /api/snippets/{id}` | `SNIPPET_ID`, `--title`, `--language`, `--content`, `--color` |
| `delete` | `DELETE /api/snippets/{id}` | `SNIPPET_ID`, `--force` |
| `pin` | `POST /api/snippets/{id}/pin` | `SNIPPET_ID` |
| `share` | `POST /api/snippets/{id}/visibility` | `SNIPPET_ID` (toggle public) |
| `short` | `GET /api/snippets/short/{code}` | `CODE` arg |

**Design notes:**
- `create` accepts content via `--content "..."` or piped stdin (`echo "code" | pastiche snippets create --title "..."`)
- `get` without `--json` prints content directly (useful for piping to clipboard/files)
- `delete` requires `--force` or interactive confirmation
- `list` supports `--query` which maps to the `q` search parameter

#### `commands/keys.py` — Command group `keys`

| Command | REST Endpoint | Key Args |
|---|---|---|
| `create` | `POST /api/keys/` | `--name` (required) |
| `list` | `GET /api/keys/` | `--limit`, `--offset` |
| `delete` | `DELETE /api/keys/{id}` | `KEY_ID`, `--force` |

**Design notes:**
- `create` prints the full key ONCE (same as web UI behavior)
- `list` shows prefix, name, request_count, last_used_at (never the full key)
- `delete` requires `--force` or confirmation

#### `commands/whoami.py` — Single command `whoami`

- Calls `GET /api/auth/me`
- Prints username, display_name, created_at
- Serves as auth validation
- `--json` for machine-readable output

#### `commands/repl.py` — Interactive REPL

- Default when no subcommand is given (per CLI-Anything spec)
- Uses `prompt_toolkit` for history, tab completion, arrow keys
- All snippet/key commands available as REPL commands
- Session state: remembers last listed snippets, current filter
- REPL prompt: `pastiche> `
- `help` command shows available commands
- `quit`/`exit`/Ctrl-D to exit

### Phase 4: REPL Skin

- Use `cli_anything.utils.repl_skin.ReplSkin` if available from CLI-Anything plugin
- Otherwise implement minimal banner + prompt styling
- Banner shows: "Pastiche CLI v0.1.0 — Code Snippets for Agents"
- Colored output: ✓ success (green), ✗ error (red), ⚠ warning (yellow), ● info (blue)

### Phase 5: Root CLI Group

`pastiche_cli.py`:

```python
@click.group(invoke_without_command=True)
@click.option('--url', envvar='PASTICHE_URL', help='Pastiche server URL')
@click.option('--api-key', envvar='PASTICHE_API_KEY', help='API key')
@click.option('--json', 'output_json', is_flag=True, help='Machine-readable JSON output')
@click.pass_context
def cli(ctx, url, api_key, output_json):
    """Pastiche CLI — manage code snippets from the terminal."""
    ctx.ensure_object(dict)
    ctx.obj['config'] = load_config(url=url, api_key=api_key)
    ctx.obj['json'] = output_json

    if ctx.invoked_subcommand is None:
        ctx.invoke(repl)
```

Global `--json` flag sets `ctx.obj['json']` so all commands check it.

### Phase 6: Test Plan

#### `tests/TEST.md`

Document before implementing:
- Unit tests for `config.py`: loading from file, env, flags, priority chain, missing config errors
- Unit tests for `client.py`: mock httpx responses, verify request construction, error handling
- Unit tests for `output.py`: table formatting, JSON output
- E2E tests: requires running Pastiche instance + API key

#### `tests/test_core.py`
- Config loading with mocked `~/.pastiche/config.toml`
- Config priority: flag > env > file
- Client request construction (headers, URL, body)
- Output formatting

#### `tests/test_full_e2e.py`
- Requires `PASTICHE_URL` and `PASTICHE_API_KEY` env vars
- Create snippet → list → get → update → pin → share → delete (full lifecycle)
- API key create → list → delete
- `whoami` auth check
- All tests use `--json` output and parse for assertions

### Phase 7: Docs + Validation

- [ ] Write `README.md` with install + usage examples
- [ ] `pip install -e .` and verify `cli-anything-pastiche --help`
- [ ] Run unit tests
- [ ] Run E2E tests against local Pastiche
- [ ] Update `docs/ARCHITECTURE.md` with CLI component
- [ ] Update `docs/SECURITY.md` with CLI key management notes

---

## File-by-File Task Order

1. **`cli/agent-harness/setup.py`** — package definition, namespace packages, console_scripts
2. **`cli/agent-harness/cli_anything/pastiche/core/config.py`** — config loading
3. **`cli/agent-harness/cli_anything/pastiche/core/output.py`** — output formatting
4. **`cli/agent-harness/cli_anything/pastiche/core/client.py`** — REST client
5. **`cli/agent-harness/cli_anything/pastiche/commands/whoami.py`** — simplest command first
6. **`cli/agent-harness/cli_anything/pastiche/commands/snippets.py`** — main CRUD
7. **`cli/agent-harness/cli_anything/pastiche/commands/keys.py`** — key management
8. **`cli/agent-harness/cli_anything/pastiche/commands/repl.py`** — interactive REPL
9. **`cli/agent-harness/cli_anything/pastiche/pastiche_cli.py`** — root Click group
10. **`cli/agent-harness/cli_anything/pastiche/__main__.py`** — entry point
11. **`cli/agent-harness/cli_anything/pastiche/__init__.py`** — package init
12. **`cli/agent-harness/cli_anything/pastiche/tests/TEST.md`** — test plan
13. **`cli/agent-harness/cli_anything/pastiche/tests/test_core.py`** — unit tests
14. **`cli/agent-harness/cli_anything/pastiche/tests/test_full_e2e.py`** — E2E tests
15. **`cli/agent-harness/pastiche.md`** — CLI-Hub description
16. **`cli/agent-harness/cli_anything/pastiche/README.md`** — usage docs
17. **`cli/agent-harness/cli_anything/pastiche/core/__init__.py`** — empty
18. **`cli/agent-harness/cli_anything/pastiche/commands/__init__.py`** — empty
19. **`cli/agent-harness/cli_anything/pastiche/tests/__init__.py`** — empty

---

## Risks

| Risk | Mitigation |
|---|---|
| No running Pastiche instance for E2E tests | Document setup steps; use `PASTICHE_URL` env var; consider mock server |
| API schema drift (backend adds fields) | Use Pydantic models loosely; avoid strict validation on response parsing |
| REPL complexity | Start with minimal prompt_toolkit; defer tab-completion of snippet IDs to v2 |
| Content size for large snippets | Use `--content` flag or stdin; paginate `list` with `--limit` |
| Auth token in config file security | Document 0600 permissions; recommend env vars in CI; never log full key |

---

## Verification

After implementation:

```bash
# Install
cd cli/agent-harness && pip install -e .

# Verify entry point
cli-anything-pastiche --help

# Verify REPL mode
cli-anything-pastiche

# Verify JSON output
cli-anything-pastiche --json whoami

# Run unit tests
cd cli/agent-harness && pytest cli_anything/pastiche/tests/test_core.py -v

# Run E2E tests (requires running Pastiche + API key)
PASTICHE_URL=http://localhost:8000 PASTICHE_API_KEY=pk_test123 \
  pytest cli_anything/pastiche/tests/test_full_e2e.py -v
```
