# Patients Management System

A full-stack monorepo for managing patient records with role-based access control.

- **Frontend:** Next.js, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** NestJS, Prisma, PostgreSQL
- **Tooling:** Turborepo, npm workspaces, Docker Compose

## App documentation

- [Backend README](apps/backend/README.md)
- [Frontend README](apps/frontend/README.md)

## Prerequisites

- **Node.js** >= 22 ([`.nvmrc`](.nvmrc))
- **npm** >= 10
- **PostgreSQL** 16+ (local install or Docker)

## Quick start

### 1. Clone and install

```bash
git clone <repository-url>
cd patients
npm install
```

### 2. Configure environment

**Backend** — copy and edit env file:

```bash
cp apps/backend/.env.example apps/backend/.env
```

**Frontend** — copy and edit env file:

```bash
cp apps/frontend/.env.example apps/frontend/.env.local
```

If PostgreSQL runs on a non-default host/port, update `DATABASE_URL` in `apps/backend/.env`.

### 3. Start PostgreSQL

**Option A — Docker (recommended):**

```bash
docker compose up postgres -d
```

Docker exposes Postgres on **port 5433** (mapped from container port 5432). If you use this, set:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/patients"
```

**Option B — local PostgreSQL:**

Create the database:

```sql
CREATE DATABASE patients;
```

Use port `5432` in `DATABASE_URL` (default in `.env.example`).

### 4. Prepare the database

```bash
npm run db:migrate
npm run db:seed
```

### 5. Run the apps

```bash
npm run dev
```

| Service  | URL |
|----------|-----|
| Frontend | http://localhost:3000 |
| Backend  | http://localhost:3001 |
| Health   | http://localhost:3001/health |

## Demo accounts

Seeded by `npm run db:seed` (override via `apps/backend/.env`):

| Role    | Email           | Password  |
|---------|-----------------|-----------|
| Admin   | admin@admin.com | P4$$w0rd  |
| Patient | user@user.com   | P4$$w0rd  |

- **Admin** — full patients list with create, edit, and delete
- **Patient** — view-only access to their own profile

When an admin **creates** a new patient, the backend sends a one-time password setup email (nodemailer). The patient opens the link, sets a password, and is signed in automatically. The link stays valid until password setup is completed.

## Patient onboarding (password setup)

1. Admin creates a patient in the UI.
2. Backend creates a user account with a random password and emails a setup link to the patient’s address.
3. Patient opens `/setup-password?token=...` and chooses a password (minimum 8 characters).
4. The setup token is deleted after use — the link cannot be reused.

**Local dev without SMTP:** leave `SMTP_HOST` empty in `apps/backend/.env`. The backend writes the setup URL to `logs/info.log` instead of sending email.

**Production:** configure SMTP in `apps/backend/.env` (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, etc.) and set `FRONTEND_URL` to your public frontend URL so links in emails are correct.

## Available scripts

Run from the repository root:

| Script | Description |
|--------|-------------|
| `npm run dev` | Start frontend and backend in development mode |
| `npm run build` | Build all apps |
| `npm run lint` | Lint all apps |
| `npm run db:migrate` | Run Prisma migrations (interactive) |
| `npm run db:seed` | Seed admin, demo user, and sample patients |
| `npm run db:generate` | Generate Prisma client |
| `npm run docker:up` | Start all services via Docker Compose |
| `npm run docker:down` | Stop Docker Compose services |
| `npm run setup` | Docker Postgres + migrate + seed + run apps (foreground) |
| `npm run setup:detach` | Same as setup, but apps run in background with health checks |

### One-command setup (Docker)

From the repository root, after `npm install`:

```bash
npm run setup
```

This script (`scripts/setup-and-run.sh`):

1. Creates missing `.env` files (root, backend, frontend)
2. Starts Postgres via Docker Compose and waits until healthy
3. Runs `prisma migrate deploy` and seeds the database
4. Starts backend and frontend, then verifies:
   - `GET http://localhost:3001/health`
   - `GET http://localhost:3000/login`

Background mode with log follow:

```bash
npm run setup:detach
# or
./scripts/setup-and-run.sh --detach --follow
```

Postgres credentials use root `.env` values (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`) with the same defaults as `docker-compose.yml`.

## Project structure

```
patients/
├── apps/
│   ├── backend/     # NestJS API + Prisma
│   └── frontend/    # Next.js UI
├── docker-compose.yml
├── package.json
└── turbo.json
```

## Docker (all services)

To run Postgres, backend, and frontend together:

```bash
cp .env.example .env   # optional — override Postgres credentials
npm run docker:up
```

Postgres credentials can be set when starting Compose (defaults shown):

| Variable | Default |
|----------|---------|
| `POSTGRES_USER` | `postgres` |
| `POSTGRES_PASSWORD` | `postgres` |
| `POSTGRES_DB` | `patients` |

Use a root `.env` file or inline env, e.g. `POSTGRES_PASSWORD=secret docker compose up postgres -d`. The backend service `DATABASE_URL` is built from the same values.

Backend and frontend services include Docker health checks (`/health` and `/login`). Compose builds and runs the **production** images (`node dist/main.js` for the API, `next start` standalone for the UI) — not dev watch mode.

See [Backend README](apps/backend/README.md) and [Frontend README](apps/frontend/README.md) for app-specific Docker and development details.

## Troubleshooting

**`Database patients does not exist`** — create the database or start the Postgres container, then run `npm run db:migrate`.

**`P3005` / database schema is not empty** — the Postgres volume has tables from an earlier `db:push` but no Prisma migration history. Re-run with a clean volume: `./scripts/setup-and-run.sh --fresh`, or let the setup script baseline existing schema automatically on the next run.

**`PrismaClientInitializationError`** — check `DATABASE_URL` in `apps/backend/.env` matches your Postgres host and port.

**Port already in use** — change `PORT` in backend `.env` or the frontend dev port in `apps/frontend/package.json`.

**Node version warnings** — use Node 22+ (`nvm use` reads `.nvmrc`).

**No setup email received** — without SMTP configured, check `apps/backend/logs/info.log` for the setup URL. Ensure `FRONTEND_URL` matches where the frontend is running.
