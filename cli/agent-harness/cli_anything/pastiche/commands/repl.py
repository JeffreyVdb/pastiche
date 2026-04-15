from __future__ import annotations

import os
import shlex
from pathlib import Path

import click
from prompt_toolkit import PromptSession
from prompt_toolkit.completion import WordCompleter
from prompt_toolkit.history import FileHistory

from cli_anything.pastiche import __version__

_COMMANDS = [
    "help",
    "whoami",
    "labels",
    "labels create",
    "labels update",
    "labels delete",
    "labels attach",
    "labels detach",
    "label-create",
    "label-update",
    "label-delete",
    "label-attach",
    "label-detach",
    "snippets create",
    "snippets list",
    "snippets get",
    "snippets update",
    "snippets delete",
    "snippets pin",
    "snippets share",
    "snippets short",
    "keys create",
    "keys list",
    "keys delete",
    "exit",
    "quit",
]

_REPL_ALIASES = {
    "labels": ["labels", "list"],
    "label-create": ["labels", "create"],
    "label-update": ["labels", "update"],
    "label-delete": ["labels", "delete"],
    "label-attach": ["labels", "attach"],
    "label-detach": ["labels", "detach"],
}


@click.command()
@click.pass_context
def repl(ctx: click.Context) -> None:
    history_path = Path.home() / ".pastiche" / "history"
    history_path.parent.mkdir(parents=True, exist_ok=True)
    if not history_path.exists():
        history_path.touch(mode=0o600)
    else:
        os.chmod(history_path, 0o600)

    click.echo(click.style(f"Pastiche CLI v{__version__} — Code Snippets for Agents", fg="cyan"))
    click.echo(click.style("Type 'help' for commands. Ctrl-D, 'exit', or 'quit' to leave.", fg="blue"))

    session = PromptSession(
        history=FileHistory(str(history_path)),
        completer=WordCompleter(_COMMANDS, ignore_case=True),
    )

    while True:
        try:
            line = session.prompt("pastiche> ")
        except EOFError:
            click.echo()
            break
        except KeyboardInterrupt:
            click.echo()
            continue

        raw = line.strip()
        if not raw:
            continue
        if raw in {"exit", "quit"}:
            break
        if raw == "help":
            click.echo("Available commands:")
            for command in _COMMANDS:
                click.echo(f"  {command}")
            continue

        try:
            args = shlex.split(raw)
        except ValueError as exc:
            click.echo(click.style(f"✗ {exc}", fg="red"))
            continue

        args = _expand_alias(args)

        from cli_anything.pastiche.pastiche_cli import cli

        try:
            cli.main(
                args=args,
                prog_name="pastiche",
                standalone_mode=False,
                obj=ctx.obj,
            )
        except SystemExit as exc:
            if exc.code not in (0, None):
                click.echo(click.style(f"✗ Command failed: {exc}", fg="red"))
        except click.ClickException as exc:
            click.echo(click.style(f"✗ {exc.format_message()}", fg="red"))


def _expand_alias(args: list[str]) -> list[str]:
    if not args:
        return args
    if args[0] == "labels":
        return ["labels", "list"] if len(args) == 1 else args
    return [*_REPL_ALIASES.get(args[0], [args[0]]), *args[1:]]
