# syntax=docker/dockerfile:1.7
FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS builder
WORKDIR /app

# Copy workspace manifests first so the install layer caches independently of source.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/auth/package.json ./packages/auth/
COPY packages/db/package.json ./packages/db/
COPY packages/rpc/package.json ./packages/rpc/
COPY packages/shared/package.json ./packages/shared/

# Install full workspace deps (build needs dev deps like vite, tsup, tailwind).
# Scripts run so the packages listed under `allowBuilds` (esbuild, sharp, workerd) install correctly.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .

ENV NODE_ENV=production
ENV NITRO_PRESET=node-server

RUN pnpm run build \
 && pnpm run build:migrate

# Produce a prod-only, self-contained bundle of @better-spa/db for running migrations.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm --filter=@better-spa/db deploy --legacy --prod /prod/db

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0

# Nitro emits a self-contained server bundle (with its own node_modules) under apps/web/.output.
COPY --from=builder --chown=node:node /app/apps/web/.output ./.output
# Migration runner entrypoint lives at ./migrate/dist/migrate/index.mjs
COPY --from=builder --chown=node:node /prod/db ./migrate

EXPOSE 3000

# To run migrations before starting the server, swap the CMD below for:
# CMD ["sh", "-c", "node ./migrate/dist/migrate/index.mjs && node ./.output/server/index.mjs"]
CMD ["node", ".output/server/index.mjs"]
