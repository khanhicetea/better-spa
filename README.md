# Better SPA

A minimal starter that implements the **Better SPA** pattern: SSR a thin shell for auth and app settings, then hand off to a SPA for everything else.

## Philosophy

> The good balance between SSR and SPA is the best stack for UX and DX. Only SSR a shell for the SPA — server rendering should check auth and populate app + user settings, then pass them into the shell. Everything else, the user can wait for first-load.

## What gets SSR'd

- **Authentication**: user session validation
- **App settings**: configuration, feature flags, environment info
- **User preferences**: theme, language, layout
- **Shell UI**: minimal HTML structure plus critical data and CSS

## What runs as SPA

- **Routing & navigation**: all client-side
- **Data fetching**: oRPC via TanStack Query
- **State**: TanStack Query for server state, `useState` for local UI state
- **Rendering**: every interactive component

## Tech stack

### Core

- **TanStack Start** — full-stack React framework
- **TanStack Router** — type-safe routing
- **TanStack Query** — server state
- **React 19** with the React Compiler
- **oRPC** — type-safe RPC (mobile/native ready)

### Auth

- **Better Auth** — email/password, OAuth (GitHub, Google), cookie sessions

### Database

- **Kysely** with handwritten schema types (no codegen)
- **PostgreSQL** for both dev and prod (a `docker-compose.yml` is included for local Postgres)

### UI

- **shadcn/ui** components
- **Base UI** (`@base-ui/react`) primitives — use the `render` prop, never `asChild`
- **Tailwind CSS v4** with theme tokens (`bg-primary`, `bg-muted`, `text-muted-foreground`, `border-border`)
- **lucide-react** icons

## Project structure

```
shell-spa/
├── src/
│   ├── components/             # Reusable UI components
│   ├── env/                    # Validated client + server env (t3-env)
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Auth, oRPC client, helpers
│   ├── nitro/                  # Nitro tasks (cron, etc.)
│   ├── routes/                 # File-based routing
│   │   ├── (auth)/             # Public auth pages
│   │   ├── (user)/             # Protected user routes
│   │   ├── admin/              # Admin routes
│   │   ├── api/                # API endpoints (auth, rpc, upload)
│   │   └── __root.tsx          # Shell implementation
│   └── server/                 # Server-only code
│       ├── context.ts          # Request context + AsyncLocalStorage
│       ├── db/
│       │   ├── client.ts
│       │   ├── migrate.ts
│       │   ├── migrations/     # Kysely migrations
│       │   ├── repositories/   # Type-safe repos over Kysely
│       │   └── schema/         # Handwritten table types
│       └── rpc/
│           ├── base.ts         # baseProcedure / authedProcedure / adminProcedure
│           ├── handlers/       # One file per domain
│           └── router.ts
├── docs/                       # Agent-oriented architecture docs
├── public/                     # Static assets
├── docker-compose.yml          # Local Postgres
└── AGENTS.md                   # Read first if you're an agent
```

## Getting started

### Prerequisites

- Node.js 24+ (see `.nvmrc`)
- pnpm
- PostgreSQL 16 (or use the included `docker-compose.yml`)

### Install

```bash
git clone <your-repo-url>
cd shell-spa

pnpm install
cp .env.example .env

# Generate auth secret
pnpm auth:secret
```

### Start Postgres

```bash
docker compose up -d
```

### Migrate the database

```bash
pnpm build:migrate
pnpm migrate:db
```

### Run the dev server

```bash
pnpm dev
```

The app starts on `http://localhost:3000`.

## Key features

### 1. Shell pattern

The root route at `src/routes/__root.tsx` loads shell data via RPC and caches it with TanStack Query:

```ts
beforeLoad: async ({ context }) => {
  const shell = await context.queryClient.ensureQueryData(shellQueryOptions());
  context.queryClient.setQueryData(authQueryOptions().queryKey, shell.user);
  return { shell };
};
```

The handler in `src/server/rpc/handlers/app.ts` returns the shell payload (app metadata + theme cookie). Auth state is loaded separately via `authQueryOptions()` and enforced in route-group `beforeLoad` hooks.

### 2. Protected routes

```ts
// src/routes/(user)/route.tsx
beforeLoad: async ({ context }) => {
  const user = await context.queryClient.ensureQueryData({
    ...authQueryOptions(),
    revalidateIfStale: true,
  });
  if (!user) throw redirect({ to: "/login" });
  return { user };
};
```

### 3. RPC layer

All app writes go through oRPC handlers in `src/server/rpc/handlers/`. Handlers validate input with `zod`, read/write through `context.repos`, and enforce ownership in the handler — never the UI.

See `docs/example-rpc-handler.md` for a copyable handler template, and `docs/example-route-with-loader.md` for the loader + `useSuspenseQuery` pattern.

## Common commands

```bash
pnpm dev                # start the dev server
pnpm build              # production build
pnpm preview            # run the built server with .env loaded
pnpm start              # run the built server

pnpm format             # prettier --write
pnpm lint               # oxlint --fix
pnpm check              # read-only: format:check + lint:check + check-types

pnpm build:migrate      # bundle migrations
pnpm migrate:db         # apply migrations
pnpm kysely             # raw kysely-ctl
pnpm db:snapshot        # regenerate docs/db-schema.md from the live DB

pnpm auth:secret        # generate BETTER_AUTH_SECRET
pnpm auth:generate      # regenerate Better Auth schema
pnpm ui add <component> # add a shadcn/ui component
```

See `docs/commands.md` for the full list.

## Deployment

- **Node** (default): build with `pnpm build`, run `pnpm start`. See `docs/devops.md`.
- **Cloudflare Workers**: set `NITRO_PRESET=cloudflare-module`. See `docs/cloudflare.md`.
- **Vercel**: set `NITRO_PRESET=vercel`.

The Nitro preset is selected at build time via the `NITRO_PRESET` env var (see `vite.config.ts`). The same source builds for any supported target — there are no per-target Vite configs.

## Environment variables

See `.env.example` for the full list, grouped by required / optional / OAuth / S3. The minimum to start:

- `VITE_BASE_URL` — public origin (default `http://localhost:3000`)
- `DATABASE_URL` — Postgres connection string
- `BETTER_AUTH_SECRET` — generated with `pnpm auth:secret`

Both client (`VITE_*`) and server env are validated with `@t3-oss/env-core` in `src/env/`.

## Conventions

This project is opinionated — see `AGENTS.md` for the rules every change should follow, and `docs/` for architecture deep-dives. Notable rules:

- React Compiler is enabled. Do **not** add `useMemo`, `useCallback`, or `memo`.
- Use `@base-ui/react` primitives via the `render` prop. No Radix.
- All app writes go through the RPC layer.
- In RPC handlers, prefer `context.repos` over raw Kysely.
- No optimistic updates. Refetch or use a concurrency-safe pattern.
- After every migration, regenerate `docs/db-schema.md` with `pnpm db:snapshot`.
- End every task with `pnpm check`.

## Mobile/native ready

The oRPC router in `src/server/rpc/router.ts` is a plain object with typed handlers. Any HTTP client (React Native, native desktop, another framework) can call it via `/api/rpc/*` and get the same end-to-end types.

## Learning resources

- [TanStack Start](https://tanstack.com/start/latest)
- [oRPC](https://orpc.dev/)
- [Better Auth](https://www.better-auth.com/)
- [Kysely](https://kysely.dev/)
- [Base UI](https://base-ui.com/)
