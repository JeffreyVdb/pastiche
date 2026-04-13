from __future__ import annotations

import click

from cli_anything.pastiche.commands._shared import async_command, emit_success, handle_errors, with_client
from cli_anything.pastiche.core.output import print_api_key_list, print_json


@click.group()
def keys() -> None:
    """Manage API keys."""


@keys.command("create")
@click.option("--name", required=True)
@click.pass_context
@handle_errors
@async_command
async def create(ctx: click.Context, name: str) -> None:
    async with with_client(ctx) as client:
        payload = await client.create_api_key(name)

    if ctx.obj["json"]:
        print_json(payload)
        return
    click.echo(f"Name: {payload['name']}")
    click.echo(f"Prefix: {payload['prefix']}")
    click.echo(f"Key: {payload['key']}")
    click.echo("\nStore this key now. It is only shown once.")


@keys.command("list")
@click.option("--limit", type=int, default=50, show_default=True)
@click.option("--offset", type=int, default=0, show_default=True)
@click.pass_context
@handle_errors
@async_command
async def list_keys(ctx: click.Context, limit: int, offset: int) -> None:
    async with with_client(ctx) as client:
        payload = await client.list_api_keys(limit=limit, offset=offset)

    if ctx.obj["json"]:
        print_json(payload)
        return
    print_api_key_list(payload["items"])
    click.echo(f"\nTotal: {payload['total']}  Offset: {payload['offset']}  Limit: {payload['limit']}")


@keys.command("delete")
@click.argument("key_id")
@click.option("--force", is_flag=True, help="Delete without confirmation")
@click.pass_context
@handle_errors
@async_command
async def delete(ctx: click.Context, key_id: str, force: bool) -> None:
    if not force and not click.confirm(f"Delete API key {key_id}?", default=False):
        raise click.Abort()

    async with with_client(ctx) as client:
        await client.delete_api_key(key_id)

    if ctx.obj["json"]:
        print_json({"deleted": True, "id": key_id})
        return
    emit_success(f"Deleted API key {key_id}")
