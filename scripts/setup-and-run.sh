#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-patients}"
BACKEND_PORT="${PORT:-3001}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
BACKEND_HOST="${BACKEND_HOST:-localhost}"
FRONTEND_HOST="${FRONTEND_HOST:-localhost}"
DETACH=false
FOLLOW=false
FRESH=false

usage() {
  cat <<'EOF'
Usage: ./scripts/setup-and-run.sh [options]

Sets up Docker (Postgres), runs Prisma migrations and seed, starts the app stack,
and verifies health endpoints.

Options:
  --detach    Start services in the background after setup
  --follow    Follow service logs after setup (implies --detach)
  --fresh     Reset the Postgres Docker volume before migrating (wipes DB data)
  -h, --help  Show this help message

Environment (root .env or shell):
  POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
  PORT / BACKEND_PORT, FRONTEND_PORT, BACKEND_HOST, FRONTEND_HOST
EOF
}

log() {
  printf '\n==> %s\n' "$1"
}

die() {
  printf 'Error: %s\n' "$1" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "'$1' is required but not installed."
}

ensure_directory() {
  local dir="$1"
  if [[ ! -d "$dir" ]]; then
    mkdir -p "$dir"
    echo "Created directory: ${dir}"
  fi
}

ensure_file_from_example() {
  local target="$1"
  local example="$2"

  if [[ -f "$target" ]]; then
    return
  fi

  if [[ -f "$example" ]]; then
    cp "$example" "$target"
    echo "Created ${target} from ${example}"
    return
  fi

  die "Missing ${target} and no ${example} template found"
}

upsert_env_var() {
  local file="$1"
  local key="$2"
  local value="$3"

  touch "$file"

  if grep -q "^${key}=" "$file" 2>/dev/null; then
    local escaped
    escaped="$(printf '%s' "$value" | sed 's/[&/\]/\\&/g')"
    sed -i.bak "s|^${key}=.*|${key}=\"${escaped}\"|" "$file"
    rm -f "${file}.bak"
  else
    printf '%s="%s"\n' "$key" "$value" >>"$file"
  fi
}

write_default_root_env() {
  cat >.env <<'EOF'
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=patients
BACKEND_PORT=3001
FRONTEND_PORT=3000
BACKEND_HOST=localhost
FRONTEND_HOST=localhost
EOF
  echo "Created .env with default values"
}

write_default_backend_env() {
  cat >apps/backend/.env <<'EOF'
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/patients"
PORT=3001
CORS_ORIGIN="http://localhost:3000"
FRONTEND_URL="http://localhost:3000"
JWT_SECRET="change-me-in-production"
JWT_EXPIRES_IN="1h"
ADMIN_EMAIL="admin@admin.com"
ADMIN_PASSWORD="P4$$w0rd"
USER_EMAIL="user@user.com"
USER_PASSWORD="P4$$w0rd"
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM="Patients <noreply@localhost>"
LOG_DIR="logs"
LOG_CONSOLE="false"
LOG_ROTATION="size"
LOG_MAX_SIZE_BYTES="10485760"
LOG_MAX_FILES="5"
EOF
  echo "Created apps/backend/.env with default values"
}

write_default_frontend_env() {
  cat >apps/frontend/.env.local <<'EOF'
NEXT_PUBLIC_API_URL=http://localhost:3001
EOF
  echo "Created apps/frontend/.env.local with default values"
}

load_env() {
  if [[ -f .env ]]; then
    set -a
    # shellcheck disable=SC1091
    source .env
    set +a
  fi

  POSTGRES_USER="${POSTGRES_USER:-postgres}"
  POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
  POSTGRES_DB="${POSTGRES_DB:-patients}"
  BACKEND_PORT="${BACKEND_PORT:-${PORT:-3001}}"
  FRONTEND_PORT="${FRONTEND_PORT:-3000}"
  BACKEND_HOST="${BACKEND_HOST:-localhost}"
  FRONTEND_HOST="${FRONTEND_HOST:-localhost}"
  export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}"
}

ensure_directories() {
  log "Ensuring required directories exist"
  ensure_directory "apps/backend/logs"
}

ensure_env_files() {
  log "Ensuring environment files exist"

  if [[ ! -f .env ]]; then
    if [[ -f .env.example ]]; then
      cp .env.example .env
      echo "Created .env from .env.example"
    else
      write_default_root_env
    fi
  fi

  if [[ ! -f apps/backend/.env ]]; then
    if [[ -f apps/backend/.env.example ]]; then
      cp apps/backend/.env.example apps/backend/.env
      echo "Created apps/backend/.env from .env.example"
    else
      write_default_backend_env
    fi
  fi

  if [[ ! -f apps/frontend/.env.local ]]; then
    if [[ -f apps/frontend/.env.example ]]; then
      cp apps/frontend/.env.example apps/frontend/.env.local
      echo "Created apps/frontend/.env.local from .env.example"
    else
      write_default_frontend_env
    fi
  fi

  load_env

  upsert_env_var "apps/backend/.env" "DATABASE_URL" "$DATABASE_URL"
  upsert_env_var "apps/backend/.env" "PORT" "$BACKEND_PORT"
  upsert_env_var "apps/backend/.env" "CORS_ORIGIN" "http://${FRONTEND_HOST}:${FRONTEND_PORT}"
  upsert_env_var "apps/backend/.env" "FRONTEND_URL" "http://${FRONTEND_HOST}:${FRONTEND_PORT}"
  upsert_env_var "apps/backend/.env" "LOG_DIR" "logs"

  if ! grep -q '^JWT_SECRET=' apps/backend/.env; then
    upsert_env_var "apps/backend/.env" "JWT_SECRET" "change-me-in-production"
  fi

  upsert_env_var "apps/frontend/.env.local" "NEXT_PUBLIC_API_URL" \
    "http://${BACKEND_HOST}:${BACKEND_PORT}"
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --detach)
        DETACH=true
        ;;
      --follow)
        DETACH=true
        FOLLOW=true
        ;;
      --fresh)
        FRESH=true
        ;;
      -h | --help)
        usage
        exit 0
        ;;
      *)
        die "Unknown option: $1"
        ;;
    esac
    shift
  done
}

install_dependencies() {
  if [[ ! -d node_modules ]]; then
    log "Installing npm dependencies"
    npm install
  else
    log "npm dependencies already installed"
  fi
}

wait_for_postgres() {
  local retries=45
  log "Waiting for Postgres to become healthy"

  while [[ $retries -gt 0 ]]; do
    if docker compose exec -T postgres \
      pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
      echo "Postgres is healthy"
      return 0
    fi

    retries=$((retries - 1))
    sleep 2
  done

  return 1
}

postgres_container_id() {
  docker compose ps -q postgres 2>/dev/null || true
}

postgres_health_status() {
  local container_id="$1"
  if [[ -z "$container_id" ]]; then
    echo "missing"
    return
  fi

  docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \
    "$container_id" 2>/dev/null || echo "unknown"
}

diagnose_postgres_failure() {
  log "Postgres startup diagnostics"
  docker compose ps postgres 2>&1 || true
  docker compose logs postgres --tail 30 2>&1 || true

  if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:5432 -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port 5432 is already in use on the host. Stop the other Postgres process or change the mapped port."
  fi
}

recover_postgres() {
  log "Attempting Postgres recovery"
  docker compose rm -sf postgres >/dev/null 2>&1 || true
  docker compose up postgres -d
}

start_postgres() {
  log "Starting Postgres with Docker Compose"
  docker compose up postgres -d

  if wait_for_postgres; then
    return
  fi

  diagnose_postgres_failure
  recover_postgres

  if wait_for_postgres; then
    return
  fi

  diagnose_postgres_failure
  die "Postgres did not become healthy. Try ./scripts/setup-and-run.sh --fresh if the data volume is corrupted."
}

reset_postgres() {
  log "Resetting Postgres volume (--fresh)"
  docker compose down -v
  start_postgres
}

psql_query() {
  docker compose exec -T postgres \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "$1"
}

database_has_migration_history() {
  psql_query "SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
  );" | grep -q '^t$'
}

database_has_user_tables() {
  psql_query "SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name NOT IN ('_prisma_migrations')
  );" | grep -q '^t$'
}

baseline_existing_schema() {
  log "Database has tables but no migration history — baselining migrations"
  local migration

  for migration in apps/backend/prisma/migrations/*/; do
    [[ -d "$migration" ]] || continue
    migration="$(basename "$migration")"
    echo "Marking ${migration} as applied"
    (
      cd apps/backend
      DATABASE_URL="$DATABASE_URL" npx prisma migrate resolve --applied "$migration"
    )
  done
}

run_migrations() {
  log "Generating Prisma client"
  npm run db:generate

  if database_has_user_tables && ! database_has_migration_history; then
    baseline_existing_schema
  fi

  log "Applying database migrations"
  DATABASE_URL="$DATABASE_URL" npm run db:migrate:deploy --workspace=backend
}

run_seed() {
  log "Seeding database"
  DATABASE_URL="$DATABASE_URL" npm run db:seed --workspace=backend
}

start_application_stack() {
  if [[ "$DETACH" == true ]]; then
    log "Starting backend and frontend in the background"
    DOCKER_BUILDKIT=1 docker compose build --parallel backend frontend
    docker compose up -d backend frontend
    wait_for_http "http://${BACKEND_HOST}:${BACKEND_PORT}/health" "Backend API"
    wait_for_http "http://${FRONTEND_HOST}:${FRONTEND_PORT}/login" "Frontend"
    print_summary

    if [[ "$FOLLOW" == true ]]; then
      docker compose logs -f backend frontend
    fi
    return
  fi

  print_summary
  log "Starting backend and frontend in the foreground (Ctrl+C to stop)"
  DOCKER_BUILDKIT=1 docker compose build --parallel backend frontend
  docker compose up backend frontend
}

wait_for_http() {
  local url="$1"
  local name="$2"
  local retries="${3:-60}"
  log "Waiting for ${name} (${url})"

  while [[ $retries -gt 0 ]]; do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "${name} is healthy"
      return 0
    fi
    retries=$((retries - 1))
    sleep 2
  done

  die "${name} failed health check: ${url}"
}

print_summary() {
  cat <<EOF

Setup complete.

| Service  | URL |
|----------|-----|
| Frontend | http://${FRONTEND_HOST}:${FRONTEND_PORT} |
| Backend  | http://${BACKEND_HOST}:${BACKEND_PORT} |
| Health   | http://${BACKEND_HOST}:${BACKEND_PORT}/health |

Demo accounts (after seed):
  Admin:   admin@admin.com / P4\$\$w0rd
  Patient: user@user.com / P4\$\$w0rd

Useful commands:
  docker compose ps
  docker compose logs -f
  npm run docker:down
EOF
}

main() {
  parse_args "$@"
  require_command docker
  require_command curl
  require_command npm
  require_command node

  export DOCKER_BUILDKIT=1
  export COMPOSE_DOCKER_CLI_BUILD=1

  ensure_directories
  ensure_env_files

  install_dependencies

  if [[ "$FRESH" == true ]]; then
    reset_postgres
  else
    start_postgres
  fi

  run_migrations
  run_seed
  start_application_stack
}

main "$@"
