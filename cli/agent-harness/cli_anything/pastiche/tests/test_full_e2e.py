from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest


pytestmark = pytest.mark.skipif(
    not os.getenv("PASTICHE_URL") or not os.getenv("PASTICHE_API_KEY"),
    reason="PASTICHE_URL and PASTICHE_API_KEY are required for e2e tests",
)


PACKAGE_ROOT = Path(__file__).resolve().parents[3]


def run_cli(*args: str, input_text: str | None = None) -> dict | list:
    env = os.environ.copy()
    completed = subprocess.run(
        [sys.executable, "-m", "cli_anything.pastiche", "--json", *args],
        cwd=PACKAGE_ROOT,
        env=env,
        input=input_text,
        text=True,
        capture_output=True,
        check=True,
    )
    return json.loads(completed.stdout)


def test_whoami():
    data = run_cli("whoami")
    assert data["username"]


def test_snippet_lifecycle():
    created = run_cli(
        "snippets",
        "create",
        "--title",
        "cli test snippet",
        "--language",
        "python",
        input_text="print('hello from cli')",
    )
    snippet_id = created["id"]

    listed = run_cli("snippets", "list", "--query", "cli test snippet")
    assert any(item["id"] == snippet_id for item in listed["items"])

    fetched = run_cli("snippets", "get", snippet_id)
    assert fetched["content"] == "print('hello from cli')"

    updated = run_cli("snippets", "update", snippet_id, "--color", "blue", "--title", "cli test snippet updated")
    assert updated["title"] == "cli test snippet updated"
    assert updated["color"] == "blue"

    pinned = run_cli("snippets", "pin", snippet_id)
    assert pinned["is_pinned"] is True

    shared = run_cli("snippets", "share", snippet_id)
    assert shared["is_public"] is True

    run_cli("snippets", "delete", snippet_id, "--force")


def test_key_lifecycle():
    created = run_cli("keys", "create", "--name", "cli e2e key")
    key_id = created["id"]
    assert created["key"].startswith("pk_")

    listed = run_cli("keys", "list")
    assert any(item["id"] == key_id for item in listed["items"])

    run_cli("keys", "delete", key_id, "--force")