from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve .env from project root (three levels up: core/ → app/ → backend/ → project root)
_env_file = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_env_file, extra="ignore")

    # Database
    database_url: str = "postgresql+asyncpg://pastiche:pastiche@localhost:5432/pastiche"

    # JWT
    jwt_secret_key: str = "dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 10080  # 7 days

    # GitHub OAuth
    github_client_id: str = ""
    github_client_secret: str = ""

    # App
    port: int = 8000
    secret_key: str = "dev-session-secret-change-in-production"
    frontend_url: str = "http://localhost:5173"
    backend_url: str = "http://localhost:8000"
    environment: str = "development"

    @property
    def is_development(self) -> bool:
        return self.environment == "development"


settings = Settings()
