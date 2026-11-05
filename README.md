# headroom

> see how much month you have left at the end of your money.

Headroom is a full-stack cash-flow visualiser for students. It turns bank/UPI SMS and CSV exports into reviewable transactions, projects the next 30 days of cash position, highlights tight days, and reports how many days of discretionary spending remain.

![Headroom login screen](docs/screenshots/login.png)

## What it does

- **Cash-flow dashboard** — 30-day balance projection, burn rate, headroom days, recurring charges, and collision warnings.
- **Smart import** — paste multiple bank/UPI messages or upload a bank CSV; redact PII, extract candidates, detect duplicates, review, then confirm.
- **Ledger** — inspect and manage posted transactions across cash, UPI, checking, savings, and credit-card accounts.
- **Budgets and groups** — track category budgets and shared expenses with settlement calculations.
- **Multi-currency accounts** — keep account currencies separate while selecting the currency used for a projection.
- **Authentication** — password-based registration/login with JWT access tokens and refresh-token cookies.

The interface follows the project’s Bauhaus design system: hard-edged geometry, semantic red/blue/yellow states, an 8px spacing grid, and lowercase UI microcopy.

## Screenshots

| Authentication | Registration |
|---|---|
| ![Login](docs/screenshots/login.png) | ![Register](docs/screenshots/register.png) |

The screenshots show the public routes. The dashboard and import review screens require a running API and a signed-in user; the seeded Riya account is provided for local development.

## Architecture

```mermaid
flowchart LR
  Browser["React + Vite web app"] -->|REST /api| API["Express API"]
  API --> Auth["JWT auth + rate limiting"]
  API --> Services["Projection + realization services"]
  API --> Parsers["@headroom/parsers"]
  API --> DB[("PostgreSQL")]
  Parsers --> PII["PII redaction"]
  Parsers --> Match["CSV/SMS parsing + duplicate matching"]
  Services --> Projection["@headroom/projection"]
  Services --> Settle["@headroom/settle"]
  Browser --> Shared["@headroom/shared"]
  API --> Shared
```

See the detailed data flow and package boundaries in [docs/architecture.md](docs/architecture.md).

## Repository layout

```text
apps/
  api/       Express API, Drizzle schema, migrations, seed data, tests
  web/       React/Vite client, pages, components, design tokens
packages/
  parsers/   SMS/CSV parsing, PII redaction, duplicate detection
  projection/ Cash-flow projection and headroom calculations
  settle/    Group settlement minimisation
  shared/    Shared schemas and utilities
docs/
  architecture.md
  screenshots/
```

## Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL 14+ (local or hosted)
- Optional: a Gemini API key for AI-assisted extraction paths

## Quick start

```bash
git clone https://github.com/prathamg07/headroom-visualiser.git
cd headroom-visualiser
npm install
Copy-Item .env.example .env
```

Set the values in `.env` before starting the services. The Vite proxy targets port `4001`, so keep `PORT=4001` for the API unless you also update [apps/web/vite.config.js](apps/web/vite.config.js).

```dotenv
PORT=4001
CLIENT_URL=http://localhost:5174
DATABASE_URL=postgres://postgres:postgres@localhost:5432/headroom
JWT_ACCESS_SECRET=replace-with-a-long-random-secret
JWT_REFRESH_SECRET=replace-with-a-different-long-random-secret
GEMINI_API_KEY=optional
```

Initialize and seed the database:

```bash
npm run db:push
npm run db:seed
```

Start the API and web app in separate terminals:

```bash
npm run dev:api
npm run dev:web
```

Open [http://localhost:5174](http://localhost:5174). The Vite server proxies `/api` requests to the API.

### Seed account

The seed script creates a realistic projection scenario:

```text
email:    riya@student.edu
password: Password123!
```

It includes savings, cash, and credit-card accounts, 14 days of discretionary history, recurring bills, and an incoming parents’ transfer. Do not use this password outside local development.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev:web` | Start the Vite client on port 5174 |
| `npm run dev:api` | Start the API with nodemon |
| `npm run build` | Build all workspaces |
| `npm test` | Run workspace tests |
| `npm run db:push` | Apply the current Drizzle schema |
| `npm run db:generate` | Generate a Drizzle migration |
| `npm run db:migrate` | Run generated migrations |
| `npm run db:seed` | Insert the local demo scenario |

Run focused checks while developing:

```bash
npm --workspace=@headroom/api test
npm --workspace=@headroom/parsers test
npm --workspace=@headroom/projection test
npm --workspace=@headroom/settle test
npm run build
```

## Import flow

1. Paste SMS text or choose a CSV file.
2. PII is redacted before parsing.
3. SMS templates or CSV column detection produce candidate transactions.
4. Duplicate matching assigns `create`, `update`, or `skip` actions.
5. Review and edit candidates in the UI.
6. Confirm the batch to write transactions and refresh the projection.

## Projection model

The projection package:

- calculates median daily discretionary burn over the configured history window;
- applies posted transactions, recurring projected rows, and future burn erosion;
- classifies each day as `safe`, `tight`, or `danger` against the user buffer;
- flags runs of adjacent danger days as collisions; and
- finds the first future date below the buffer to calculate headroom days.

## API surface

The API is grouped by resource:

```text
/api/auth
/api/me
/api/accounts
/api/categories
/api/transactions
/api/recurrences
/api/projection
/api/imports
/api/groups
/api/budgets
/api/income
```

Health check: `GET /health`.

## Security and privacy notes

- Keep `.env` out of source control; it is ignored by git.
- Use separate, random JWT secrets for development and production.
- Imported text is redacted before parser processing, but users should still avoid pasting unrelated secrets.
- This project is an educational/portfolio application, not financial advice or a bank connection.

## Project documentation

- [Product requirements](Headroom-PRD.md)
- [Design system](Headroom-Design-System.md)
- [Architecture and data flow](docs/architecture.md)

## License

No license has been declared yet. Add a license before distributing the project.
