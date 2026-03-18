# Production Deployment

## Overview

Production runs three containers via `compose.prod.yml`:

| Container | Image |
|---|---|
| `db` | `public.ecr.aws/docker/library/postgres:18-alpine` |
| `backend` | `ghcr.io/jeffreyvdb/pastiche-backend` |
| `frontend` | `ghcr.io/jeffreyvdb/pastiche-frontend` (nginx) |

## Quick start

```sh
cp .env.example .env
# Edit .env — fill in all required variables (see below)
just deploy
# or: podman-compose -f compose.prod.yml up -d
```

## Building images

```sh
# Build both images locally (tagged with git version + latest)
just build-all

# Build, then push to ghcr.io/jeffreyvdb/
just release
```

Images are published to:
- `ghcr.io/jeffreyvdb/pastiche-backend`
- `ghcr.io/jeffreyvdb/pastiche-frontend`

## Environment variables

### Required

| Variable | Description |
|---|---|
| `POSTGRES_PASSWORD` | PostgreSQL password (enforced by compose — no default) |
| `JWT_SECRET_KEY` | Signs JWT access tokens — use a long random secret |
| `SECRET_KEY` | Signs session cookies (Starlette SessionMiddleware) — use a long random secret |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |
| `FRONTEND_URL` | Public URL of the frontend (used for CORS and OAuth redirect) |
| `BACKEND_URL` | Public URL of the backend API origin, **without** a trailing `/api` (e.g. `https://example.com`). Used to construct the OAuth callback URL. |

### Optional

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://pastiche:pastiche@localhost:5432/pastiche` | Full async PostgreSQL connection string |
| `JWT_ALGORITHM` | `HS256` | JWT signing algorithm |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | `10080` (7 days) | JWT token lifetime in minutes |
| `ENVIRONMENT` | `development` | Set to `production` to enable secure cookies and disable SQL echo |
| `PORT` | `8000` | Backend listen port inside the container |
| `POSTGRES_USER` | `pastiche` | PostgreSQL username |
| `POSTGRES_DB` | `pastiche` | PostgreSQL database name |
| `DB_PORT` | `5432` | Host port mapped to PostgreSQL |
| `BACKEND_PORT` | `8000` | Host port mapped to the backend |
| `FRONTEND_PORT` | `80` | Host port mapped to the frontend (nginx) |

## Database migrations

Migrations are managed with Alembic. Run them against the live database after deploying:

```sh
# From inside the backend container
podman exec -it <backend-container> alembic upgrade head

# Or from the backend/ directory with DATABASE_URL pointing at the prod DB
cd backend && alembic upgrade head
```

## GitHub OAuth setup

1. Go to **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Set **Authorization callback URL** to `{BACKEND_URL}/api/auth/github/callback`.
3. Copy the **Client ID** and generate a **Client secret**.
4. Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `.env`.
