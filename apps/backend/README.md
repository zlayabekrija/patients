# Backend

NestJS REST API for the Patients Management System.

[← Back to root README](../../README.md)

## Stack

- NestJS 11
- Prisma ORM
- PostgreSQL
- JWT authentication with role-based access control
- Nodemailer for patient password-setup emails

## Setup

From the **repository root**:

```bash
npm install
cp apps/backend/.env.example apps/backend/.env
npm run db:migrate
npm run db:seed
```

Ensure PostgreSQL is running and `DATABASE_URL` in `.env` is correct before migrating.

## Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | — |
| `PORT` | API port | `3001` |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:3000` |
| `FRONTEND_URL` | Base URL for links in emails | `http://localhost:3000` |
| `JWT_SECRET` | JWT signing secret | — |
| `JWT_EXPIRES_IN` | Token expiry | `1h` |
| `ADMIN_EMAIL` | Seed admin email | `admin@admin.com` |
| `ADMIN_PASSWORD` | Seed admin password | `P4$$w0rd` |
| `USER_EMAIL` | Seed patient user email | `user@user.com` |
| `USER_PASSWORD` | Seed patient user password | `P4$$w0rd` |
| `SMTP_HOST` | SMTP server host (empty = log emails to console) | — |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_SECURE` | Use TLS (`true`/`false`) | `false` |
| `SMTP_USER` | SMTP username | — |
| `SMTP_PASS` | SMTP password | — |
| `SMTP_FROM` | Sender address | `Patients <noreply@localhost>` |
| `LOG_DIR` | Log file directory | `logs` |
| `LOG_CONSOLE` | Mirror logs to stdout | `false` |
| `LOG_ROTATION` | `size` or `day` log rotation | `size` |
| `LOG_MAX_SIZE_BYTES` | Size threshold before rotation | `10485760` (10 MB) |
| `LOG_MAX_FILES` | Numbered rotated files kept (`*-2.log`, etc.) | `5` |

## Development

From the repository root:

```bash
npm run dev --workspace=backend
```

Or from this directory:

```bash
npm run dev
```

API base URL: http://localhost:3001

## Logging

The backend uses **Winston** with NestJS’s `LoggerService` integration. All application and HTTP logs are written to files under `LOG_DIR` (default: `apps/backend/logs/` when running from that workspace).

| File | Contents |
|------|----------|
| `info.log` | Info, warn, debug, verbose, and HTTP request logs |
| `error.log` | Server errors (5xx) and unhandled exceptions with masked stack traces |

When a file exceeds the size threshold (or on day change in `day` mode), it is rotated to numbered siblings: `info-2.log`, `info-3.log`, `error-2.log`, etc. Oldest files beyond `LOG_MAX_FILES` are deleted.

Every HTTP request gets a **trace ID** (`X-Request-Id` header). The same ID appears in request logs, application logs during that request, error logs, and API error responses — use it to follow a single request end to end.

```
2026-06-13T12:00:00.000Z [traceId=8b1f3c2d-...] [HTTP] http: GET /patients 200 87ms
2026-06-13T12:00:00.100Z [traceId=8b1f3c2d-...] [ExceptionFilter] error: GET /patients/xyz failed with 500: ...
```

PII (email, phone, sensitive query params, setup tokens) is masked before writing.

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_DIR` | Directory for log files | `logs` (relative to process cwd) |
| `LOG_CONSOLE` | Also echo logs to stdout (`true`/`false`) | `false` |
| `LOG_ROTATION` | `size` or `day` | `size` |
| `LOG_MAX_SIZE_BYTES` | Rotate when file exceeds this size | `10485760` (10 MB) |
| `LOG_MAX_FILES` | Max numbered rotated files per stream | `5` |

Use the standard Nest `Logger` in services — `main.ts` registers `FileLoggerService` as the global logger. HTTP requests are logged by `RequestLoggingInterceptor`. Uncaught errors are logged by `AllExceptionsFilter` (4xx → `info.log` as warn; 5xx → `error.log` with stack).

Clients may send `X-Request-Id` to continue an existing trace; otherwise the server generates one and returns it on the response.

Masking helpers live in `src/common/utils/mask-pii.ts` (`maskEmail`, `maskPhone`, `maskName`, `maskSetupUrl`, etc.).

## Database scripts

| Script | Description |
|--------|-------------|
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Apply migrations (interactive) |
| `npm run db:seed` | Seed users and patients |
| `npm run db:reset` | Reset database and re-run migrations |

From root, use `npm run db:migrate`, `npm run db:seed`, etc.

## API endpoints

| Method | Path | Access |
|--------|------|--------|
| `POST` | `/auth/login` | Public |
| `GET` | `/auth/setup-password/validate?token=...` | Public |
| `POST` | `/auth/setup-password` | Public |
| `GET` | `/health` | Public |
| `GET` | `/patients` | Admin (all), User (own profile only) |
| `GET` | `/patients/:id` | Admin, User (own record only) |
| `POST` | `/patients` | Admin (sends password setup email) |
| `PUT` | `/patients/:id` | Admin |
| `DELETE` | `/patients/:id` | Admin |

### Password setup flow

When an admin creates a patient via `POST /patients`:

1. A `User` and `Patient` record are created; the user gets a random password they do not know.
2. A one-time `PasswordSetupToken` is stored and an email is sent with a link to `{FRONTEND_URL}/setup-password?token=...`.
3. `GET /auth/setup-password/validate` checks the token and returns the account email.
4. `POST /auth/setup-password` with `{ token, password }` sets the password, deletes the token, and returns a JWT (same shape as login).

If `SMTP_HOST` is not set, the setup URL is logged to the console instead of being emailed.

## Docker

The backend is included in the root `docker-compose.yml`. To run only Postgres:

```bash
docker compose up postgres -d
```

To run the full stack from root:

```bash
npm run docker:up
```

See the [root README](../../README.md) for port mappings and setup order.
