# Pastiche

A personal code snippets platform. Save, tag, and browse your code snippets with GitHub OAuth login.

## Tech stack

- **Backend** — FastAPI, SQLAlchemy (async), Alembic, PostgreSQL
- **Frontend** — React 19, TanStack Router, Tailwind CSS
- **Auth** — GitHub OAuth + JWT
- **Runtime** — Python 3.14+ with uv, Node.js 22+ with pnpm

## Prerequisites

- [Podman](https://podman.io/) + [podman-compose](https://github.com/containers/podman-compose)
- [Python 3.14+](https://www.python.org/) with [uv](https://docs.astral.sh/uv/)
- [Node.js 22+](https://nodejs.org/) with [pnpm](https://pnpm.io/)
- A [GitHub OAuth App](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app)

## Getting started

1. **Clone the repo**

   ```sh
   git clone https://github.com/jeffreyvdb/pastiche.git
   cd pastiche
   ```

2. **Start PostgreSQL**

   ```sh
   podman-compose up -d
   ```

3. **Configure environment**

   ```sh
   cp .env.example .env
   ```

   Edit `.env` and fill in your GitHub OAuth credentials (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`).

4. **Start the backend**

   ```sh
   cd backend
   uv sync
   alembic upgrade head
   uvicorn app.main:app --reload
   ```

5. **Start the frontend**

   ```sh
   cd frontend
   pnpm install
   pnpm dev
   ```

6. Open [http://localhost:5173](http://localhost:5173)

## Production

See [docs/deploy.md](docs/deploy.md) for production deployment instructions and a full environment variable reference.

## Justfile commands

| Command | Description |
|---|---|
| `just version` | Print the computed image version (from git tags) |
| `just build backend` | Build the backend container image |
| `just build frontend` | Build the frontend container image |
| `just build-all` | Build both backend and frontend images |
| `just release` | Build and push all images to ghcr.io |
| `just deploy` | Deploy the production stack with podman-compose |
