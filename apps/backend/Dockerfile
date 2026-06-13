# syntax=docker/dockerfile:1
# Backend image — only root manifests + backend sources are copied.

FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl

# Install only backend workspace dependencies.
# The frontend package.json stub is required for npm workspaces lockfile resolution.
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspace=backend --include-workspace-root

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
COPY apps/backend/nest-cli.json apps/backend/tsconfig.json apps/backend/tsconfig.build.json apps/backend/prisma.config.ts ./apps/backend/
COPY apps/backend/prisma ./apps/backend/prisma
COPY apps/backend/src ./apps/backend/src
# prisma.config.ts loads DATABASE_URL at config parse time; generate does not connect.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN npm run db:generate --workspace=backend
RUN npm run build --workspace=backend
RUN test -f apps/backend/dist/main.js

FROM builder AS prod-deps
ENV NODE_ENV=production
RUN npm prune --omit=dev --workspace=backend --include-workspace-root

FROM node:22-alpine AS production
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/package.json ./
COPY --from=builder /app/apps/backend/prisma ./prisma
COPY --from=builder /app/apps/backend/prisma.config.ts ./prisma.config.ts
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/backend/node_modules ./apps/backend/node_modules
EXPOSE 3001
CMD ["node", "dist/main.js"]

FROM builder AS development
WORKDIR /app
EXPOSE 3001
CMD ["npm", "run", "start:prod", "--workspace=backend"]
