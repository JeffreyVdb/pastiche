from __future__ import annotations

import click
from click.core import ParameterSource

from cli_anything.pastiche.commands.keys import keys
from cli_anything.pastiche.commands.labels import labels
from cli_anything.pastiche.commands.repl import repl
from cli_anything.pastiche.commands.snippets import snippets
from cli_anything.pastiche.commands.whoami import whoami
from cli_anything.pastiche.core.config import ConfigError, load_config


@click.group(invoke_without_command=True)
@click.option("--url", envvar="PASTICHE_URL", help="Pastiche server URL")
@click.option("--api-key", envvar="PASTICHE_API_KEY", help="Pastiche API key")
@click.option("--json", "output_json", is_flag=True, help="Machine-readable JSON output")
@click.pass_context
def cli(ctx: click.Context, url: str | None, api_key: str | None, output_json: bool) -> None:
    """Pastiche CLI — manage code snippets from the terminal."""
    ctx.ensure_object(dict)
    url_source = ctx.get_parameter_source("url")
    api_key_source = ctx.get_parameter_source("api_key")
    json_source = ctx.get_parameter_source("output_json")

    has_explicit_overrides = (
        url_source is ParameterSource.COMMANDLINE
        or api_key_source is ParameterSource.COMMANDLINE
    )
    if "config" not in ctx.obj or has_explicit_overrides:
        try:
            ctx.obj["config"] = load_config(url=url, api_key=api_key)
        except ConfigError as exc:
            raise click.ClickException(str(exc)) from exc
    ctx.obj["json"] = output_json if json_source is ParameterSource.COMMANDLINE else ctx.obj.get("json", output_json)
    ctx.obj.setdefault("repl_state", {})

    if ctx.invoked_subcommand is None:
        ctx.invoke(repl)


cli.add_command(snippets)
cli.add_command(labels)
cli.add_command(keys)
cli.add_command(whoami)
cli.add_command(repl)
