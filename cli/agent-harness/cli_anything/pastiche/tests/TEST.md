# Test plan

Unit tests:
- config.py: load from file, env, flags; enforce flag > env > file priority; validate missing config
- client.py: construct requests with Bearer auth; decode success payloads; raise structured errors on API failures
- output.py: format JSON and human-readable table/snippet output
- CLI root: `--json` propagated through context and REPL invoked when no subcommand is provided

E2E tests:
- require `PASTICHE_URL` and `PASTICHE_API_KEY`
- snippet lifecycle: create, list, get, update, pin, share, delete
- key lifecycle: create, list, delete
- auth check: whoami