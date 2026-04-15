from __future__ import annotations

import click

from cli_anything.pastiche.commands._shared import async_command, emit_success, handle_errors, with_client
from cli_anything.pastiche.core.output import print_json, print_label_list


@click.group()
def labels() -> None:
    """Manage labels."""


@labels.command("list")
@click.pass_context
@handle_errors
@async_command
async def list_labels(ctx: click.Context) -> None:
    async with with_client(ctx) as client:
        payload = await client.list_labels()

    if ctx.obj["json"]:
        print_json(payload)
        return
    print_label_list(payload)


@labels.command("create")
@click.argument("name")
@click.pass_context
@handle_errors
@async_command
async def create(ctx: click.Context, name: str) -> None:
    async with with_client(ctx) as client:
        payload = await client.create_label(name)

    if ctx.obj["json"]:
        print_json(payload)
        return
    click.echo(f"Created label #{payload['name']} ({payload['color']})")


@labels.command("delete")
@click.argument("label_id")
@click.option("--force", is_flag=True, help="Delete without confirmation")
@click.pass_context
@handle_errors
@async_command
async def delete(ctx: click.Context, label_id: str, force: bool) -> None:
    if not force and not click.confirm(f"Delete label {label_id}?", default=False):
        raise click.Abort()

    async with with_client(ctx) as client:
        await client.delete_label(label_id)

    if ctx.obj["json"]:
        print_json({"deleted": True, "id": label_id})
        return
    emit_success(f"Deleted label {label_id}")


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


@labels.command("attach")
@click.argument("snippet_id")
@click.argument("label_id")
@click.pass_context
@handle_errors
@async_command
async def attach(ctx: click.Context, snippet_id: str, label_id: str) -> None:
    async with with_client(ctx) as client:
        await client.attach_label(label_id, snippet_id)

    if ctx.obj["json"]:
        print_json({"attached": True, "snippet_id": snippet_id, "label_id": label_id})
        return
    emit_success(f"Attached label {label_id} to snippet {snippet_id}")


@labels.command("detach")
@click.argument("snippet_id")
@click.argument("label_id")
@click.pass_context
@handle_errors
@async_command
async def detach(ctx: click.Context, snippet_id: str, label_id: str) -> None:
    async with with_client(ctx) as client:
        await client.detach_label(label_id, snippet_id)

    if ctx.obj["json"]:
        print_json({"detached": True, "snippet_id": snippet_id, "label_id": label_id})
        return
    emit_success(f"Detached label {label_id} from snippet {snippet_id}")
