from __future__ import annotations

import click

from cli_anything.pastiche.commands._shared import async_command, handle_errors, with_client
from cli_anything.pastiche.core.output import print_json, print_user


@click.command()
@click.pass_context
@handle_errors
@async_command
async def whoami(ctx: click.Context) -> None:
    async with with_client(ctx) as client:
        payload = await client.get_me()

    if ctx.obj["json"]:
        print_json(payload)
        return
    print_user(payload)
