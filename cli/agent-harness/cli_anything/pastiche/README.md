# cli-anything-pastiche

Pastiche CLI for humans and agents.

## Install

```bash
cd cli/agent-harness
pip install -e .
```

## Config

Priority: flags > env > `~/.pastiche/config.toml`

```toml
[server]
url = "https://pastiche.example.com"

[auth]
api_key = "pk_..."
```

## Commands

```bash
cli-anything-pastiche whoami
cli-anything-pastiche snippets list --limit 10
cli-anything-pastiche snippets create --title "Example" --language python < snippet.py
cli-anything-pastiche snippets get SNIPPET_ID
cli-anything-pastiche snippets update SNIPPET_ID --color blue
cli-anything-pastiche snippets delete SNIPPET_ID --force
cli-anything-pastiche snippets short abc123
cli-anything-pastiche keys create --name "my agent"
cli-anything-pastiche keys list
cli-anything-pastiche keys delete KEY_ID --force
```

## REPL

Run without a subcommand to start the REPL:

```bash
cli-anything-pastiche
```

The REPL supports history, tab completion, and reuses the same command syntax as the normal CLI.
