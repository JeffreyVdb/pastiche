from __future__ import annotations

import json
from collections.abc import Sequence
from typing import Any

import click


def print_json(data: Any) -> None:
    click.echo(json.dumps(data, indent=2, sort_keys=True))


def print_table(headers: Sequence[str], rows: Sequence[Sequence[Any]]) -> None:
    widths = [len(str(header)) for header in headers]
    normalized_rows = [["" if value is None else str(value) for value in row] for row in rows]
    for row in normalized_rows:
        for index, value in enumerate(row):
            widths[index] = max(widths[index], len(value))

    fmt = "  ".join(f"{{:<{width}}}" for width in widths)
    click.echo(fmt.format(*headers))
    click.echo(fmt.format(*["-" * width for width in widths]))
    for row in normalized_rows:
        click.echo(fmt.format(*row))


def print_snippet(snippet: dict[str, Any]) -> None:
    lines = [
        f"Title: {snippet['title']}",
        f"Language: {snippet['language']}",
        f"Created: {snippet['created_at']}",
        f"Updated: {snippet['updated_at']}",
        f"Pinned: {'yes' if snippet.get('is_pinned') else 'no'}",
        f"Public: {'yes' if snippet.get('is_public') else 'no'}",
        f"Color: {snippet.get('color') or 'none'}",
        f"Short code: {snippet.get('short_code', '-')}",
        "",
        snippet.get("content", ""),
    ]
    click.echo("\n".join(lines))


def print_snippet_list(items: Sequence[dict[str, Any]]) -> None:
    print_table(
        ["id", "title", "language", "size", "short", "pinned", "public", "color", "updated"],
        [
            [
                item["id"],
                item["title"],
                item["language"],
                item.get("content_size", "-"),
                item.get("short_code", "-"),
                "yes" if item.get("is_pinned") else "no",
                "yes" if item.get("is_public") else "no",
                item.get("color") or "none",
                item["updated_at"],
            ]
            for item in items
        ],
    )


def print_api_key_list(items: Sequence[dict[str, Any]]) -> None:
    print_table(
        ["id", "name", "prefix", "requests", "last_used", "created"],
        [
            [
                item["id"],
                item["name"],
                item["prefix"],
                item["request_count"],
                item.get("last_used_at") or "never",
                item["created_at"],
            ]
            for item in items
        ],
    )


def print_label_list(items: Sequence[dict[str, Any]]) -> None:
    print_table(
        ["id", "name", "color"],
        [[item["id"], item["name"], item["color"]] for item in items],
    )


def print_user(user: dict[str, Any]) -> None:
    click.echo("\n".join([
        f"Username: {user['username']}",
        f"Display name: {user.get('display_name') or '-'}",
        f"Email: {user.get('email') or '-'}",
        f"Created: {user['created_at']}",
    ]))
