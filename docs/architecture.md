# Architecture

## System context

```mermaid
flowchart TB
  User["Student"] --> Web["Headroom web client"]
  Web --> API["Headroom API"]
  API --> Postgres[("PostgreSQL")]
  API --> Gemini["Gemini API (optional extraction assistance)"]
  API --> ImportSources["User-provided SMS / CSV"]
```

The browser is the only client in the current repository. Direct bank connections are intentionally out of scope for v1; all imports are initiated by the user.

## Runtime request flow

```mermaid
sequenceDiagram
  participant U as User
  participant W as React client
  participant A as Express API
  participant P as Parsers
  participant D as PostgreSQL
  participant X as Projection

  U->>W: Paste SMS or upload CSV
  W->>A: POST /api/imports/*
  A->>P: Redact PII and parse candidates
  P-->>A: Candidates + unmatched text
  A->>D: Store import batch
  A-->>W: Reviewable candidates
  U->>W: Confirm reviewed candidates
  W->>A: POST /api/imports/:id/confirm
  A->>D: Write transactions
  W->>A: GET /api/projection
  A->>X: Calculate burn, balances, collisions
  X-->>A: Daily path + headroom summary
  A-->>W: Dashboard projection
```

## Workspace boundaries

| Workspace | Responsibility |
|---|---|
| `apps/web` | Routes, auth context, React Query data loading, dashboard and review UI |
| `apps/api` | Express middleware/routes, auth, persistence, import orchestration |
| `packages/parsers` | PII masking, Indian/US SMS templates, CSV parsing, trigram duplicate matching |
| `packages/projection` | Burn-rate, balance walk, day classification, collision detection, headroom |
| `packages/settle` | Group balance calculation and minimum-transfer settlement |
| `packages/shared` | Shared application-level values and helpers |

## Core data model

```mermaid
erDiagram
  USERS ||--o{ ACCOUNTS : owns
  USERS ||--o{ CATEGORIES : defines
  USERS ||--o{ TRANSACTIONS : records
  USERS ||--o{ RECURRENCES : schedules
  ACCOUNTS ||--o{ TRANSACTIONS : contains
  ACCOUNTS ||--o{ RECURRENCES : charges
  CATEGORIES ||--o{ TRANSACTIONS : classifies
  CATEGORIES ||--o{ RECURRENCES : classifies
  RECURRENCES ||--o{ PROJECTED_ROWS : creates
  USERS ||--o{ GROUPS : owns
  GROUPS ||--o{ GROUP_MEMBERS : has
  GROUPS ||--o{ EXPENSES : records

  USERS {
    uuid id PK
    string email
    string password_hash
    string timezone
    string base_currency
  }
  ACCOUNTS {
    uuid id PK
    uuid user_id FK
    string kind
    string currency
    decimal opening_balance
  }
  TRANSACTIONS {
    uuid id PK
    uuid user_id FK
    uuid account_id FK
    decimal amount
    string direction
    datetime posted_at
  }
  RECURRENCES {
    uuid id PK
    uuid account_id FK
    decimal amount
    string cadence
    datetime next_at
  }
  PROJECTED_ROWS {
    uuid id PK
    uuid recurrence_id FK
    datetime due_at
    decimal amount
  }
```

## Deployment notes

For local development, Vite serves the client on port `5174` and proxies `/api` to the API on port `4001`. PostgreSQL is external to both processes. In production, serve the built client from a static host and deploy the API with a managed PostgreSQL database; configure `CLIENT_URL`, database credentials, and long random JWT secrets through the platform secret manager.
