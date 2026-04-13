from __future__ import annotations

import os
import tomllib
from dataclasses import dataclass
from pathlib import Path


CONFIG_DIR_NAME = ".pastiche"
CONFIG_FILE_NAME = "config.toml"
DIR_MODE = 0o700
FILE_MODE = 0o600


class ConfigError(RuntimeError):
    pass


@dataclass(slots=True)
class PasticheConfig:
    url: str
    api_key: str


def config_dir(home: Path | None = None) -> Path:
    return (home or Path.home()) / CONFIG_DIR_NAME


def config_path(home: Path | None = None) -> Path:
    return config_dir(home) / CONFIG_FILE_NAME


def ensure_config_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)
    os.chmod(path, DIR_MODE)


def ensure_config_file_permissions(path: Path) -> None:
    if path.exists():
        os.chmod(path, FILE_MODE)


def _load_file_config(path: Path) -> tuple[str | None, str | None]:
    if not path.exists():
        return None, None

    ensure_config_file_permissions(path)
    with path.open("rb") as handle:
        data = tomllib.load(handle)

    server = data.get("server") or {}
    auth = data.get("auth") or {}
    return server.get("url"), auth.get("api_key")


def load_config(*, url: str | None = None, api_key: str | None = None) -> PasticheConfig:
    cfg_dir = config_dir()
    cfg_path = config_path()
    ensure_config_dir(cfg_dir)
    file_url, file_api_key = _load_file_config(cfg_path)

    resolved_url = url or os.getenv("PASTICHE_URL") or file_url
    resolved_api_key = api_key or os.getenv("PASTICHE_API_KEY") or file_api_key

    if not resolved_url or not resolved_api_key:
        raise ConfigError(
            "Missing Pastiche configuration: provide --url/--api-key, set PASTICHE_URL/PASTICHE_API_KEY, or write ~/.pastiche/config.toml"
        )

    return PasticheConfig(url=resolved_url.rstrip("/"), api_key=resolved_api_key)
