# Better SPA

A production-minded shell-SPA starter. TanStack Start server-renders one small bootstrap
payload and shell, then TanStack Router, TanStack Query, and oRPC drive the application as
an SPA.

The repository targets Node.js 24 and Cloudflare Workers without changing the application
or RPC contracts.

## Stack

- React 19 with React Compiler
- Expo SDK 57 and Expo Router for iOS and Android
- TanStack Start, Router, and Query
- oRPC with explicit serialized DTOs
- Better Auth with email/password and optional GitHub or Google OAuth
- PostgreSQL 16, Kysely, and handwritten schema types
- Base UI primitives, Tailwind CSS v4, and lucide-react
- Nitro for the Node adapter and the Cloudflare Vite plugin for Workers

## Architecture

`app.bootstrap` is the canonical root query. It returns:

- application name, package version, environment, and runtime
- the signed-in user's safe profile summary or `null`
- theme and timezone preferences
- enabled OAuth providers and upload availability

The root loader hydrates that query once. Auth guards, navigation, theme setup, and
capability-driven UI all read the same cache entry. Auth, profile, account, and
impersonation transitions invalidate it.

Application writes go through oRPC. Better Auth's ordinary sign-in, sign-up, sign-out,
session, and account lifecycle continue to use its HTTP client. Admin identity writes use
admin-only oRPC mutations so authorization, errors, cookies, logging, and invalidation share
one boundary.

Uploads are private. Authenticated clients request short-lived, content-type-bound S3 `PUT`
URLs from `file.createUploadIntents`; reads use `file.createReadUrl`. Object keys are scoped
to `users/{userId}/`, and no durable public URL is returned.

See [the architecture guide](docs/better-spa-architecture.md),
[RPC guide](docs/rpc-architecture.md), and [storage guide](docs/file-storage.md).

## Workspace

```text
apps/web/                    TanStack Start web application and runtime adapters
apps/mobile/                 Expo app using Better Auth and the shared oRPC surface
packages/auth/               Better Auth factory and CLI-only configuration
packages/db/                 Kysely client, migrations, schema, repositories
packages/observability/      Server-only structured request and DB logging
packages/rpc/                Context, DTOs, storage signer, handlers, router
packages/shared/             Browser-safe shared utilities
docs/                        Architecture and operations reference
scripts/                     Workspace validation and setup
```

UI code is split between upstream-style primitives in
`apps/web/src/components/ui/`, shell components in `apps/web/src/components/shell/`, and
route-owned features beside their routes.

## Setup

Prerequisites:

- Node.js 24
- pnpm 11.1.3
- Docker with Compose, or a compatible PostgreSQL database

For a new checkout:

```bash
pnpm install --frozen-lockfile
pnpm setup
pnpm dev
```

`pnpm setup` checks Node and pnpm, creates `.env` only when absent, generates a missing
`BETTER_AUTH_SECRET` without printing it, validates the configuration, starts PostgreSQL,
runs migrations, and prints the local URL.

For manual setup, copy `.env.example` to `.env`, configure the required values, then run:

```bash
pnpm db:up
pnpm db:migrate
pnpm dev
```

The local web app is available at `http://localhost:3000`. Run `pnpm dev:mobile` in a
second terminal for Expo; see [apps/mobile/README.md](apps/mobile/README.md) for device URL
configuration.

## Commands

```bash
pnpm dev
pnpm dev:mobile         # Expo development server
pnpm mobile:ios
pnpm mobile:android
pnpm build              # Node production build
pnpm build:node
pnpm build:worker
pnpm preview            # Node output with the root .env
pnpm start

pnpm check              # read-only format, lint, workspace, and type checks
pnpm check:build
pnpm check:full         # builds, Knip, Worker type drift, Worker dry-run
pnpm knip

pnpm db:up
pnpm db:down
pnpm db:migrate
pnpm db:snapshot

pnpm auth:secret
pnpm auth:generate
pnpm ui add <component>

pnpm worker:types
pnpm worker:preview
pnpm worker:deploy
```

See [docs/commands.md](docs/commands.md) for exact behavior.

## Deployment

Node:

```bash
pnpm build:node
pnpm start
```

The Node server keeps one process-level database/auth/repository set, limits API bodies to
1 MiB by default, applies 30-second request deadlines, supports explicit trusted-proxy
parsing, and shuts resources down gracefully. See [docs/devops.md](docs/devops.md).

Cloudflare Workers:

```bash
pnpm worker:types
pnpm build:worker
pnpm worker:dry-run
pnpm worker:deploy
```

Workers use a required Hyperdrive binding and create request-scoped PostgreSQL resources.
Configure real binding IDs and secrets before deployment. See
[docs/cloudflare.md](docs/cloudflare.md).

Both runtimes expose:

- `/api/health/live`: process/isolate liveness
- `/api/health/ready`: database-backed readiness

Every response carries `x-request-id`; server and DB events use structured JSON logs with
sensitive values redacted.

## Environment

The minimum Node configuration is:

- `VITE_BASE_URL`
- `DATABASE_URL`
- `BETTER_AUTH_SECRET`

OAuth and private storage are enabled only when their complete credential sets are present.
See [.env.example](.env.example), [docs/file-storage.md](docs/file-storage.md), and the
runtime deployment guides.

## Project rules

- oRPC, not tRPC
- Base UI's `render` prop, never Radix `asChild`
- no `useMemo`, `useCallback`, or `memo`; React Compiler is enabled
- TanStack Query for server state; local React state only for local UI state
- no optimistic writes
- repositories over raw Kysely in handlers
- ISO date strings across RPC boundaries
- no Kysely code generation
- regenerate `docs/db-schema.md` after every migration
- finish every task with `pnpm check`

Read [AGENTS.md](AGENTS.md) before changing the repository.

## Mobile app

`apps/mobile` is an Expo SDK 57 app with email/password sign-in and sign-up through Better
Auth. Session cookies are kept in Expo SecureStore and attached to authenticated oRPC
requests. Its task screen uses the same `todo.*` procedures as the web app, and the account
screen verifies the shared `app.bootstrap` connection. See
[apps/mobile/README.md](apps/mobile/README.md).
