from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from contextlib import AbstractAsyncContextManager
from functools import wraps
from typing import Any, ParamSpec, TypeVar

import click
import httpx

from cli_anything.pastiche.core.client import PasticheClient, PasticheError


def _client_config_from_context(ctx: click.Context):
    return ctx.obj.get("client_config") or ctx.obj["config"]


P = ParamSpec("P")
R = TypeVar("R")


def async_command(fn: Callable[P, Awaitable[R]]) -> Callable[P, R]:
    @wraps(fn)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        return asyncio.run(fn(*args, **kwargs))

    return wrapper


def handle_errors(fn: Callable[P, R]) -> Callable[P, R]:
    @wraps(fn)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        try:
            return fn(*args, **kwargs)
        except PasticheError as exc:
            raise click.ClickException(str(exc)) from exc
        except httpx.HTTPError as exc:
            raise click.ClickException(f"Network error: {exc}") from exc

    return wrapper


def with_client(ctx: click.Context) -> AbstractAsyncContextManager[PasticheClient]:
    return PasticheClient(_client_config_from_context(ctx))


def emit_success(message: str) -> None:
    click.echo(click.style(f"✓ {message}", fg="green"))
