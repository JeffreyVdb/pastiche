from __future__ import annotations

import json
import uuid
from pathlib import Path

import click
import httpx
import pytest
from click.testing import CliRunner


def test_load_config_prefers_flags_over_env_over_file(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    from cli_anything.pastiche.core.config import load_config

    config_home = tmp_path / "config-home"
    monkeypatch.setenv("HOME", str(config_home))
    monkeypatch.setenv("PASTICHE_URL", "https://env.example")
    monkeypatch.setenv("PASTICHE_API_KEY", "env-key")

    config_dir = config_home / ".pastiche"
    config_dir.mkdir(parents=True)
    config_file = config_dir / "config.toml"
    config_file.write_text(
        "[server]\nurl = \"https://file.example\"\n[auth]\napi_key = \"file-key\"\n",
        encoding="utf-8",
    )

    config = load_config(url="https://flag.example", api_key="flag-key")

    assert config.url == "https://flag.example"
    assert config.api_key == "flag-key"


def test_load_config_uses_env_when_flags_missing(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    from cli_anything.pastiche.core.config import load_config

    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.setenv("PASTICHE_URL", "https://env.example")
    monkeypatch.setenv("PASTICHE_API_KEY", "env-key")

    config = load_config()

    assert config.url == "https://env.example"
    assert config.api_key == "env-key"


def test_load_config_reads_file_and_sets_permissions(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    from cli_anything.pastiche.core.config import load_config

    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.delenv("PASTICHE_URL", raising=False)
    monkeypatch.delenv("PASTICHE_API_KEY", raising=False)

    config_dir = tmp_path / ".pastiche"
    config_dir.mkdir(mode=0o755)
    config_file = config_dir / "config.toml"
    config_file.write_text(
        "[server]\nurl = \"https://file.example\"\n[auth]\napi_key = \"file-key\"\n",
        encoding="utf-8",
    )

    config = load_config()

    assert config.url == "https://file.example"
    assert config.api_key == "file-key"
    assert config_dir.stat().st_mode & 0o777 == 0o700
    assert config_file.stat().st_mode & 0o777 == 0o600


def test_load_config_raises_clear_error_when_missing(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    from cli_anything.pastiche.core.config import ConfigError, load_config

    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.delenv("PASTICHE_URL", raising=False)
    monkeypatch.delenv("PASTICHE_API_KEY", raising=False)

    with pytest.raises(ConfigError, match="Missing Pastiche configuration"):
        load_config()


@pytest.mark.asyncio
async def test_client_includes_bearer_header_and_base_url():
    from cli_anything.pastiche.core.client import PasticheClient
    from cli_anything.pastiche.core.config import PasticheConfig

    requests: list[httpx.Request] = []

    async def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(
            200,
            json={"id": str(uuid.uuid4()), "username": "jeff", "display_name": "Jeff", "created_at": "2026-04-10T10:00:00"},
        )

    transport = httpx.MockTransport(handler)
    async with PasticheClient(PasticheConfig(url="https://pastiche.example", api_key="secret"), transport=transport) as client:
        payload = await client.get_me()

    assert payload["username"] == "jeff"
    assert requests[0].url == httpx.URL("https://pastiche.example/api/auth/me")
    assert requests[0].headers["Authorization"] == "Bearer secret"


@pytest.mark.asyncio
async def test_client_raises_pastiche_error_for_non_2xx():
    from cli_anything.pastiche.core.client import PasticheClient, PasticheError
    from cli_anything.pastiche.core.config import PasticheConfig

    async def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(404, json={"detail": "Snippet not found"})

    transport = httpx.MockTransport(handler)
    async with PasticheClient(PasticheConfig(url="https://pastiche.example", api_key="secret"), transport=transport) as client:
        with pytest.raises(PasticheError, match="Snippet not found") as excinfo:
            await client.get_snippet("missing")

    assert excinfo.value.status == 404
    assert excinfo.value.detail == "Snippet not found"


def test_print_helpers_render_human_and_json(capsys: pytest.CaptureFixture[str]):
    from cli_anything.pastiche.core.output import print_json, print_snippet, print_snippet_list, print_table

    print_table(["id", "title"], [["1", "alpha"], ["2", "beta"]])
    print_snippet(
        {
            "id": "123",
            "title": "Example",
            "language": "python",
            "content": "print('hi')",
            "short_code": "abc123",
            "is_pinned": True,
            "is_public": False,
            "color": "blue",
            "created_at": "2026-04-10T10:00:00",
            "updated_at": "2026-04-10T10:01:00",
        }
    )
    print_snippet_list(
        [
            {
                "id": "1",
                "title": "alpha",
                "language": "python",
                "content_size": 11,
                "short_code": "aaa",
                "is_pinned": True,
                "is_public": False,
                "color": None,
                "created_at": "2026-04-10T10:00:00",
                "updated_at": "2026-04-10T10:01:00",
            }
        ]
    )
    print_json({"ok": True})

    output = capsys.readouterr().out
    assert "Example" in output
    assert "alpha" in output
    assert '"ok": true' in output


def test_cli_invokes_repl_when_no_subcommand(monkeypatch: pytest.MonkeyPatch):
    from cli_anything.pastiche.pastiche_cli import cli

    called: list[bool] = []

    def fake_load_config(*, url=None, api_key=None):
        return {"url": url, "api_key": api_key}

    def fake_repl(**_kwargs):
        called.append(True)

    monkeypatch.setattr("cli_anything.pastiche.pastiche_cli.load_config", fake_load_config)
    monkeypatch.setattr("cli_anything.pastiche.pastiche_cli.repl", fake_repl)

    runner = CliRunner()
    result = runner.invoke(cli, ["--url", "https://example.com", "--api-key", "token"])

    assert result.exit_code == 0
    assert called == [True]


def test_cli_json_flag_is_stored_in_context(monkeypatch: pytest.MonkeyPatch):
    from cli_anything.pastiche.pastiche_cli import cli

    def fake_load_config(*, url=None, api_key=None):
        return {"url": url, "api_key": api_key}

    @cli.command("probe")
    @pytest.importorskip("click").pass_context
    def probe(ctx):
        click = pytest.importorskip("click")
        click.echo(json.dumps(ctx.obj))

    monkeypatch.setattr("cli_anything.pastiche.pastiche_cli.load_config", fake_load_config)

    runner = CliRunner()
    result = runner.invoke(cli, ["--json", "--url", "https://example.com", "--api-key", "token", "probe"])

    assert result.exit_code == 0
    payload = json.loads(result.output)
    assert payload["json"] is True
    assert payload["config"] == {"url": "https://example.com", "api_key": "token"}

    cli.commands.pop("probe", None)


def test_cli_reuses_existing_config_in_repl_reentry(monkeypatch: pytest.MonkeyPatch):
    from cli_anything.pastiche.pastiche_cli import cli

    def fail_load_config(*, url=None, api_key=None):
        raise AssertionError(f"load_config should not be called again: {url=} {api_key=}")

    @cli.command("probe-reentry")
    @click.pass_context
    def probe_reentry(ctx):
        click.echo(json.dumps(ctx.obj))

    monkeypatch.setattr("cli_anything.pastiche.pastiche_cli.load_config", fail_load_config)

    runner = CliRunner()
    result = runner.invoke(
        cli,
        ["probe-reentry"],
        obj={"config": {"url": "https://example.com", "api_key": "token"}, "json": True},
    )

    assert result.exit_code == 0
    payload = json.loads(result.output)
    assert payload["config"] == {"url": "https://example.com", "api_key": "token"}
    assert payload["json"] is True

    cli.commands.pop("probe-reentry", None)


def test_handle_errors_converts_httpx_failures_to_click_exceptions():
    from cli_anything.pastiche.commands._shared import handle_errors

    @handle_errors
    def boom():
        request = httpx.Request("GET", "https://pastiche.example/api/auth/me")
        raise httpx.ConnectError("no route to host", request=request)

    with pytest.raises(click.ClickException, match="Network error"):
        boom()


@pytest.mark.asyncio
async def test_client_supports_label_endpoints_and_snippet_filters():
    from cli_anything.pastiche.core.client import PasticheClient
    from cli_anything.pastiche.core.config import PasticheConfig

    requests: list[httpx.Request] = []

    async def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200, json={"ok": True})

    transport = httpx.MockTransport(handler)
    async with PasticheClient(
        PasticheConfig(url="https://pastiche.example", api_key="secret"),
        transport=transport,
    ) as client:
        await client.list_labels()
        await client.create_label("Frontend")
        await client.update_label("label-1", name="UI", color="#123abc")
        await client.attach_label("label-1", "snippet-1")
        await client.detach_label("label-1", "snippet-1")
        await client.delete_label("label-1")
        await client.list_snippets(
            q="debounce #frontend !#bug",
            labels=["frontend", "ui"],
            exclude_labels=["bug"],
        )

    assert requests[0].url == httpx.URL("https://pastiche.example/api/labels")
    assert requests[1].method == "POST"
    assert requests[1].content.decode() == '{"name":"Frontend"}'
    assert requests[2].method == "PATCH"
    assert requests[2].url == httpx.URL("https://pastiche.example/api/labels/label-1")
    assert requests[3].method == "PUT"
    assert requests[3].url == httpx.URL("https://pastiche.example/api/labels/label-1/snippets/snippet-1")
    assert requests[4].method == "DELETE"
    assert requests[4].url == httpx.URL("https://pastiche.example/api/labels/label-1/snippets/snippet-1")
    assert requests[5].method == "DELETE"
    assert requests[5].url == httpx.URL("https://pastiche.example/api/labels/label-1")
    assert requests[6].url.params.get_list("labels") == ["frontend", "ui"]
    assert requests[6].url.params.get_list("exclude_labels") == ["bug"]


def test_snippets_commands_forward_label_flags(monkeypatch: pytest.MonkeyPatch):
    from cli_anything.pastiche.commands.snippets import snippets

    class DummyClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return None

        async def create_snippet(self, **kwargs):
            calls.append(("create", kwargs))
            return {"id": "snippet-1", **kwargs, "short_code": "abc", "is_pinned": False, "is_public": False, "color": None, "created_at": "now", "updated_at": "now"}

        async def update_snippet(self, snippet_id, **kwargs):
            calls.append(("update", snippet_id, kwargs))
            return {"id": snippet_id, "title": kwargs.get("title") or "Old", "language": kwargs.get("language") or "python", "content": kwargs.get("content") or "print(1)", "short_code": "abc", "is_pinned": False, "is_public": False, "color": kwargs.get("color"), "created_at": "now", "updated_at": "now"}

    calls: list[tuple] = []

    monkeypatch.setattr("cli_anything.pastiche.commands.snippets.with_client", lambda ctx: DummyClient())

    runner = CliRunner()
    result = runner.invoke(
        snippets,
        ["create", "--title", "Example", "--content", "print(1)", "--labels", "frontend, urgent"],
        obj={"json": True, "config": {"url": "https://example.com", "api_key": "***"}},
    )
    assert result.exit_code == 0

    result = runner.invoke(
        snippets,
        ["update", "snippet-1", "--labels", "frontend", "--title", "Updated"],
        obj={"json": True, "config": {"url": "https://example.com", "api_key": "***"}},
    )
    assert result.exit_code == 0

    assert calls[0] == (
        "create",
        {"title": "Example", "language": "autodetect", "content": "print(1)", "labels": ["frontend", "urgent"]},
    )
    assert calls[1] == (
        "update",
        "snippet-1",
        {"title": "Updated", "language": None, "content": None, "color": None, "labels": ["frontend"]},
    )


def test_labels_commands_call_client(monkeypatch: pytest.MonkeyPatch):
    from cli_anything.pastiche.commands.labels import labels

    class DummyClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return None

        async def list_labels(self):
            calls.append(("list",))
            return [{"id": "label-1", "name": "Frontend", "color": "#123abc"}]

        async def create_label(self, name):
            calls.append(("create", name))
            return {"id": "label-1", "name": name, "color": "#123abc"}

        async def delete_label(self, label_id):
            calls.append(("delete", label_id))
            return None

    calls: list[tuple] = []
    monkeypatch.setattr("cli_anything.pastiche.commands.labels.with_client", lambda ctx: DummyClient())

    runner = CliRunner()
    for args in (["list"], ["create", "Frontend"], ["delete", "label-1", "--force"]):
        result = runner.invoke(
            labels,
            args,
            obj={"json": True, "config": {"url": "https://example.com", "api_key": "***"}},
        )
        assert result.exit_code == 0

    assert calls == [("list",), ("create", "Frontend"), ("delete", "label-1")]