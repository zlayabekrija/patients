# syntax=docker/dockerfile:1
# Frontend image — only root manifests + frontend sources are copied.

FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Install only frontend workspace dependencies.
# The backend package.json stub is required for npm workspaces lockfile resolution.
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspace=frontend --include-workspace-root

FROM base AS builder
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
COPY apps/frontend/next.config.ts apps/frontend/tsconfig.json apps/frontend/postcss.config.mjs apps/frontend/components.json ./apps/frontend/
COPY apps/frontend/public ./apps/frontend/public
COPY apps/frontend/src ./apps/frontend/src
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN --mount=type=cache,target=/app/apps/frontend/.next/cache \
    npm run build --workspace=frontend
RUN test -f apps/frontend/.next/standalone/apps/frontend/server.js

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=builder /app/apps/frontend/.next/standalone ./
COPY --from=builder /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public
WORKDIR /app/apps/frontend
EXPOSE 3000
CMD ["node", "server.js"]

FROM deps AS development
COPY apps/frontend/next.config.ts apps/frontend/tsconfig.json apps/frontend/postcss.config.mjs apps/frontend/components.json ./apps/frontend/
COPY apps/frontend/public ./apps/frontend/public
COPY apps/frontend/src ./apps/frontend/src
WORKDIR /app/apps/frontend
EXPOSE 3000
ENV NEXT_TELEMETRY_DISABLED=1
CMD ["npm", "run", "start"]
