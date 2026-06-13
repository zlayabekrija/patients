# Frontend

Next.js web application for the Patients Management System.

[← Back to root README](../../README.md)

## Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- TanStack Query
- react-hook-form + zod

## Setup

From the **repository root**:

```bash
npm install
cp apps/frontend/.env.example apps/frontend/.env.local
```

Make sure the backend is running before using the app.

## Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:3001` |

## Development

From the repository root:

```bash
npm run dev --workspace=frontend
```

Or start both apps together:

```bash
npm run dev
```

App URL: http://localhost:3000

## Routes

| Path | Description |
|------|-------------|
| `/login` | Sign in |
| `/setup-password` | One-time password setup (from email link; public) |
| `/patients` | Admin patients list or patient profile (role-based) |

## Roles

- **Admin** (`admin@admin.com`) — search, sort, paginate, create, edit, and delete patients. Creating a patient triggers a password setup email to the patient’s address.
- **Patient** (`user@user.com`) — view-only access to their own profile (seeded with a password; no setup email)

New patients created by an admin must complete password setup via the emailed link before they can sign in at `/login`.

Demo credentials are seeded by the backend; see the [root README](../../README.md).

## Build

From the repository root:

```bash
npm run build --workspace=frontend
```

Or from this directory:

```bash
npm run build
npm run start
```

## Docker

The frontend is included in the root `docker-compose.yml`:

```bash
npm run docker:up
```

See the [root README](../../README.md) for full Docker setup instructions.
