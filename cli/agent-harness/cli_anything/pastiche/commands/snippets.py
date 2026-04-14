from __future__ import annotations

import sys

import click

from cli_anything.pastiche.commands._shared import async_command, emit_success, handle_errors, with_client
from cli_anything.pastiche.core.output import print_json, print_snippet, print_snippet_list


def _parse_labels(value: str | None) -> list[str] | None:
    if value is None:
        return None
    labels = [part.strip() for part in value.split(",") if part.strip()]
    return labels


@click.group()
def snippets() -> None:
    """Manage snippets."""


@snippets.command("create")
@click.option("--title", required=True)
@click.option("--language", default="autodetect", show_default=True)
@click.option("--content")
@click.option("--labels", help="Comma-separated label names")
@click.pass_context
@handle_errors
@async_command
async def create(ctx: click.Context, title: str, language: str, content: str | None, labels: str | None) -> None:
    snippet_content = content if content is not None else _read_content_from_stdin()
    async with with_client(ctx) as client:
        payload = await client.create_snippet(
            title=title,
            language=language,
            content=snippet_content,
            labels=_parse_labels(labels),
        )

    if ctx.obj["json"]:
        print_json(payload)
        return
    print_snippet(payload)


@snippets.command("list")
@click.option("--query", "query")
@click.option("--sort", "sort_by", type=click.Choice(["created_at", "updated_at"]), default="created_at", show_default=True)
@click.option("--order", type=click.Choice(["asc", "desc"]), default="desc", show_default=True)
@click.option("--limit", type=int, default=50, show_default=True)
@click.option("--offset", type=int, default=0, show_default=True)
@click.option("--pinned", type=click.Choice(["true", "false"]))
@click.pass_context
@handle_errors
@async_command
async def list_snippets(ctx: click.Context, query: str | None, sort_by: str, order: str, limit: int, offset: int, pinned: str | None) -> None:
    pinned_value = None if pinned is None else pinned == "true"
    async with with_client(ctx) as client:
        payload = await client.list_snippets(
            sort_by=sort_by,
            order=order,
            q=query,
            limit=limit,
            offset=offset,
            pinned=pinned_value,
        )

    ctx.obj.setdefault("repl_state", {})["last_list"] = payload
    ctx.obj.setdefault("repl_state", {})["current_filter"] = query

    if ctx.obj["json"]:
        print_json(payload)
        return
    print_snippet_list(payload["items"])
    click.echo(f"\nTotal: {payload['total']}  Offset: {payload['offset']}  Limit: {payload['limit']}")


@snippets.command("get")
@click.argument("snippet_id")
@click.pass_context
@handle_errors
@async_command
async def get(ctx: click.Context, snippet_id: str) -> None:
    async with with_client(ctx) as client:
        payload = await client.get_snippet(snippet_id)

    if ctx.obj["json"]:
        print_json(payload)
        return
    click.echo(payload["content"])


@snippets.command("update")
@click.argument("snippet_id")
@click.option("--title")
@click.option("--language")
@click.option("--content")
@click.option("--color", type=click.Choice(["red", "orange", "green", "blue", "purple", "none"]))
@click.option("--labels", help="Comma-separated label names")
@click.pass_context
@handle_errors
@async_command
async def update(ctx: click.Context, snippet_id: str, title: str | None, language: str | None, content: str | None, color: str | None, labels: str | None) -> None:
    if not any(value is not None for value in (title, language, content, color, labels)):
        raise click.ClickException("Provide at least one field to update")

    async with with_client(ctx) as client:
        payload = await client.update_snippet(
            snippet_id,
            title=title,
            language=language,
            content=content,
            color=color,
            labels=_parse_labels(labels),
        )

    if ctx.obj["json"]:
        print_json(payload)
        return
    print_snippet(payload)


@snippets.command("delete")
@click.argument("snippet_id")
@click.option("--force", is_flag=True, help="Delete without confirmation")
@click.pass_context
@handle_errors
@async_command
async def delete(ctx: click.Context, snippet_id: str, force: bool) -> None:
    if not force and not click.confirm(f"Delete snippet {snippet_id}?", default=False):
        raise click.Abort()

    async with with_client(ctx) as client:
        await client.delete_snippet(snippet_id)

    if ctx.obj["json"]:
        print_json({"deleted": True, "id": snippet_id})
        return
    emit_success(f"Deleted snippet {snippet_id}")


@snippets.command("pin")
@click.argument("snippet_id")
@click.pass_context
@handle_errors
@async_command
async def pin(ctx: click.Context, snippet_id: str) -> None:
    async with with_client(ctx) as client:
        payload = await client.toggle_pin(snippet_id)

    if ctx.obj["json"]:
        print_json(payload)
        return
    print_snippet(payload)


@snippets.command("share")
@click.argument("snippet_id")
@click.pass_context
@handle_errors
@async_command
async def share(ctx: click.Context, snippet_id: str) -> None:
    async with with_client(ctx) as client:
        payload = await client.toggle_visibility(snippet_id)

    if ctx.obj["json"]:
        print_json(payload)
        return
    print_snippet(payload)


@snippets.command("short")
@click.argument("code")
@click.pass_context
@handle_errors
@async_command
async def short(ctx: click.Context, code: str) -> None:
    async with with_client(ctx) as client:
        payload = await client.resolve_short_code(code)

    if ctx.obj["json"]:
        print_json(payload)
        return
    print_snippet(payload)


def _read_content_from_stdin() -> str:
    if sys.stdin.isatty():
        raise click.ClickException("Provide --content or pipe snippet content on stdin")

    content = sys.stdin.read()
    if not content.strip():
        raise click.ClickException("Snippet content cannot be empty")
    return content
