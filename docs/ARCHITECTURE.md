# Pastiche Architecture

Pastiche is a code snippets platform with a FastAPI backend, PostgreSQL database, and React/TypeScript frontend.

## System Overview

```mermaid
graph TB
    subgraph "Frontend"
        FE[React + Vite + TypeScript]
    end

    subgraph "CLI"
        CLI[cli-anything-pastiche<br/>Click CLI + httpx]
    end

    subgraph "Backend API"
        API[FastAPI + Uvicorn]
        AUTH[Auth Layer<br/>JWT cookie + Bearer API key]
        SNIP[Snippets Router<br/>CRUD + pin + visibility + search]
        KEYS[API Keys Router]
        PUB[Public Router]
        HEALTH[Health Router]
    end

    subgraph "Services"
        S_SNIP[SnippetService]
        S_KEY[ApiKeyService]
        S_USER[UserService]
    end

    subgraph "Data"
        DB[(PostgreSQL)]
        ALEMBIC[Alembic Migrations]
    end

    FE -->|HTTPS /api/*| API
    CLI -->|HTTPS /api/* + Bearer| API
    API --> AUTH
    API --> SNIP
    API --> KEYS
    API --> PUB
    API --> HEALTH
    SNIP --> S_SNIP
    KEYS --> S_KEY
    AUTH --> S_USER
    S_SNIP --> DB
    S_KEY --> DB
    S_USER --> DB
    ALEMBIC --> DB
```

## API Routes

```mermaid
graph LR
    subgraph "/api"
        subgraph "/auth"
            A_LOGIN[GET /auth/github/login]
            A_CALLBACK[GET /auth/github/callback]
            A_ME[GET /auth/me]
            A_LOGOUT[POST /auth/logout]
        end

        subgraph "/snippets"
            S_CREATE[POST /]
            S_LIST[GET /]
            S_GET[GET /{id}]
            S_UPDATE[PATCH /{id}]
            S_DELETE[DELETE /{id}]
            S_PIN[PATCH /{id}/pin]
            S_VIS[PATCH /{id}/visibility]
            S_SHORT[GET /resolve/{code}]
        end

        subgraph "/keys"
            K_CREATE[POST /]
            K_LIST[GET /]
            K_DELETE[DELETE /{id}]
        end

        subgraph "/s"
            P_VIEW[GET /{code}]
        end

        H_HEALTH[GET /api/health]
    end
```

## Data Model

```mermaid
erDiagram
    USER ||--o{ SNIPPET : owns
    USER ||--o{ API_KEY : owns

    USER {
        uuid id PK
        string github_id
        string username
        string display_name
        string avatar_url
        datetime created_at
    }

    SNIPPET {
        uuid id PK
        uuid user_id FK
        string title
        string language
        text content
        string short_code UK
        bool is_pinned
        bool is_public
        string color
        datetime created_at
        datetime updated_at
    }

    API_KEY {
        uuid id PK
        uuid user_id FK
        string name
        string key_hash
        string prefix
        int request_count
        datetime created_at
        datetime last_used_at
    }
```

## Auth Flow

```mermaid
sequenceDiagram
    participant Web as Web Browser
    participant FE as Frontend
    participant API as FastAPI
    participant GH as GitHub OAuth

    Note over Web,GH: Web Auth (cookie-based)
    Web->>FE: Visit app
    FE->>API: GET /api/auth/github/login
    API->>GH: Redirect to GitHub
    GH->>API: GET /api/auth/github/callback?code=...
    API->>API: Create/find user, sign JWT
    API->>FE: Set access_token cookie + redirect

    Note over CLI,API: CLI Auth (Bearer API key)
    CLI->>API: GET /api/snippets (Authorization: Bearer ...)
    API->>API: SHA256(token) → lookup key_hash
    API->>CLI: 200 OK + data
```

## CLI Architecture

```mermaid
graph TB
    subgraph "cli-anything-pastiche"
        MAIN[__main__.py]
        CLI[pastiche_cli.py]

        subgraph "core"
            CONFIG[config.py<br/>Config file + env + flags]
            CLIENT[client.py<br/>httpx REST client]
            OUTPUT[output.py<br/>Human + JSON formatting]
        end

        subgraph "commands"
            C_SNIP[snippets.py<br/>create / list / get / update / delete / pin / share]
            C_KEYS[keys.py<br/>create / list / delete]
            C_AUTH[whoami.py]
            C_REPL[repl.py<br/>Interactive REPL]
        end

        MAIN --> CLI
        CLI --> C_SNIP
        CLI --> C_KEYS
        CLI --> C_AUTH
        CLI --> C_REPL
        C_SNIP --> CLIENT
        C_KEYS --> CLIENT
        C_AUTH --> CLIENT
        CLIENT --> CONFIG
        CLIENT --> OUTPUT
    end
```

## CLI Runtime Notes

- Package location: `cli/agent-harness/`
- Entry points: `cli-anything-pastiche` and `python -m cli_anything.pastiche`
- Root command loads config once, stores shared context, and drops into the REPL when no subcommand is provided
- REPL uses `prompt_toolkit` history + completion and replays the same Click command tree used by non-interactive invocations
- Snippet short-code resolution is a two-step CLI flow: resolve code to snippet ID, then fetch the snippet payload
