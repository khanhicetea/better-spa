# AGENTS.md (or CLAUDE.md)

This file provides guidance to coding agent when working with code in this repository.

---

## CRITICAL RULES (READ FIRST)

These rules differ from typical projects. **MUST follow or risk breaking the build.**

| Standard | This Project | Critical Note |
|----------|--------------|---------------|
| tRPC | **oRPC** | Completely different API. See [docs/rpc-architecture.md](docs/rpc-architecture.md) |
| Radix UI | **Base UI** (`@base-ui/react`) | Use `render` prop, NOT `asChild` |
| Manual memoization | **React Compiler** | NEVER use `useCallback`, `useMemo`, `memo` |
| Tailwind v3 | **Tailwind v4** | No specific colors (e.g., `bg-blue-500`) unless user requests |
| ESLint/Prettier | **Biome** | `pnpm check` runs format + lint + type-check |
| Testing required | **NO TESTING** | Only add tests if explicitly requested |
| DB seeding | **NO SEEDING** | Never create seed files |
| Kysely codegen | **NO CODEGEN** | Types are manually defined in `src/server/db/schema/` |

### Base UI Render Prop Pattern (CRITICAL)

```tsx
// WRONG - Radix asChild pattern
<DialogTrigger asChild>
  <Button>Open</Button>
</DialogTrigger>

// CORRECT - Base UI render prop pattern
<DialogTrigger render={<Button />}>
  Open
</DialogTrigger>

// CORRECT - With props
<AlertDialogAction render={<Button variant="destructive" />}>
  Delete
</AlertDialogAction>
```

### React Compiler (CRITICAL)

```tsx
// WRONG - Don't do this
const handleClick = useCallback(() => { ... }, [deps]);
const computed = useMemo(() => expensive(), [deps]);
const MemoComponent = memo(Component);

// CORRECT - Just write normal code
const handleClick = () => { ... };
const computed = expensive();
function Component() { ... }
```

### Tailwind Colors (CRITICAL)

```tsx
// WRONG - Specific colors
<div className="bg-blue-500 text-white">

// CORRECT - Theme variables
<div className="bg-primary text-primary-foreground">
<div className="bg-muted text-muted-foreground">
<div className="bg-destructive text-destructive-foreground">
```

### Code Style

- **Double quotes** (enforced by Biome)
- **Auto-organize imports** (Biome `assist.organizeImports: "on"`)
- Run `pnpm check` after finishing tasks (format + lint + type-check)
- Path alias: `@/` maps to `src/`

---

## Architecture: Shell SPA Pattern

**SSR the shell** (auth, settings, minimal UI) + **SPA everything else** (routing, data, state).

### How It Works

1. **Root route** (`src/routes/__root.tsx`) SSR-fetches shell data (auth, app config) via RPC with React Query caching
2. **Client hydrates** and takes over all subsequent routing, data fetching, and state
3. **RPC calls** go through `src/lib/orpc.ts` which uses `createIsomorphicFn` — server-side calls go directly to handlers (no HTTP), client-side calls hit `/api/rpc` endpoint
4. **Server context** (`src/server/context.ts`) uses `AsyncLocalStorage` to provide request-scoped DB, auth, repos, and `waitUntil` to all handlers

### oRPC Client Setup

- `rpcClient` — raw RPC client (server = direct call, client = HTTP to `/api/rpc` with batch plugin)
- `orpc` — `createTanstackQueryUtils(rpcClient)` — use this in components for TanStack Query integration
- Access handlers via dot notation: `orpc.todo.list`, `orpc.user.get`
- **ONLY pass serialized data** from frontend into oRPC inputs (no functions, no class instances)

### RPC Procedure Types (`src/rpc/base.ts`)

- `baseProcedure` / `publicProcedure` — no auth required, rate-limited
- `authedProcedure` — requires authenticated user (adds `context.user`)
- `adminProcedure` — requires admin role

### RPC Handler Naming & Registration (`src/rpc/router.ts`)

One handler file per domain (`handlers/todo.ts`, `handlers/user.ts`). Export short action verbs: `list`, `get`, `create`, `update`, `remove`. Router keys shape the `orpc.*` frontend API — rename them for clarity:

```typescript
todo: {
  list: todo.list,
  delete: todo.remove,      // "remove" → "delete" for cleaner API
  export: todo.exportData,  // "exportData" → "export"
},
```

---

## Commands

```bash
pnpm dev                        # Dev server (port 3000)
pnpm check                      # Format + lint + type-check (RUN AFTER FINISHING)
pnpm build                      # Production build
pnpm kysely migrate latest      # Run DB migrations
pnpm ui add <name>              # Add shadcn/ui component
pnpm worker                     # Start job worker
pnpm auth:secret                # Generate auth secret
pnpm auth:generate              # Generate auth schema
```

---

## Workflow

### Before Starting Any Task

1. Read relevant docs first — see [Documentation](#documentation) table below
2. For sub-agents: pass the doc paths to read in the prompt

### When to Use Plan Mode

**USE plan mode for:** new features (pages, entities), major refactoring, complex bugs
**SKIP plan mode for:** simple bug fixes, minor UI tweaks, adding fields to existing forms

### Implementation Order

DB schema > RPC handlers > Page route > UI > `pnpm check`

### When Exploring Codebase

1. List directory structure first
2. Pick at least 1 existing file as reference example
3. Understand current patterns before suggesting changes

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | TanStack Start (SSR) |
| Routing | TanStack Router (file-based) |
| State | TanStack Query |
| RPC | oRPC (NOT tRPC) |
| Auth | Better Auth (cookie-based) |
| DB | Kysely + PostgreSQL |
| Jobs | PostgreSQL-backed queue |
| UI | React 19 + shadcn/ui (Base UI) + Tailwind v4 |
| Lint/Format | Biome (double quotes, auto-organize imports) |

React Compiler enabled — no manual useCallback/useMemo/memo needed.

## Project Structure

```
src/
├── routes/           # File-based routing
│   ├── __root.tsx    # Shell pattern (SSR shell + SPA handoff)
│   ├── (auth)/       # Auth pages (pathless group, public)
│   ├── (user)/       # Protected user routes
│   └── admin/        # Admin routes (/admin prefix)
├── rpc/              # Type-safe RPC layer
│   ├── base.ts       # Procedure definitions (base, authed, admin)
│   ├── middlewares.ts # Auth, admin, rate-limit middleware
│   ├── handlers/     # Domain procedure files
│   └── router.ts     # Main router (shapes orpc.* access)
├── lib/              # Frontend utilities
│   ├── orpc.ts       # Isomorphic RPC client + TanStack Query utils
│   ├── queries.ts    # Centralized query options
│   ├── auth/         # Auth client/server setup
│   └── helpers/      # Utility functions
├── server/
│   ├── context.ts    # AsyncLocalStorage-based request context
│   ├── db/
│   │   ├── schema/   # Manual type definitions (no codegen)
│   │   └── repositories/ # Repository pattern data access
│   └── worker/       # Background jobs
├── env/              # Type-safe env (client.ts, server.ts)
└── components/
    ├── ui/           # shadcn/ui components (Base UI based)
    ├── app/          # App-specific (sidebar, nav)
    ├── admin/        # Admin interface
    ├── common/       # Shared components
    └── data-table/   # Reusable table components
```

## Essential Rules

- **NO OPTIMISTIC UPDATES** — use pessimistic or concurrent-safe strategies
- **NO TESTING** unless explicitly requested
- After new migration, update [docs/db-schema.md](docs/db-schema.md)
- All server data operations through RPC layer, use Repository pattern for DB
- Co-locate single-use components in page route file
- Each list item: separate component for independent mutation/status
- Add nav links: `src/components/app/app-sidebar.tsx` or `admin-sidebar.tsx`

---

## Quick Reference

### Add RPC Procedure

```typescript
// 1. Create handler (src/rpc/handlers/product.ts)
export const listProducts = authedProcedure
  .input(z.object({ page: z.number() }))
  .handler(async ({ input, context }) => {
    return context.repos.product.findPaginated({ page: input.page, pageSize: 20 });
  });

// 2. Register in router (src/rpc/router.ts)
product: { list: product.listProducts }

// 3. Use in component
const { data } = useSuspenseQuery(orpc.product.list.queryOptions({ input: { page: 1 } }));
```

### Repository Usage

```typescript
// Simple queries
const items = await repos.product.find({ categoryId: "123" });
const item = await repos.product.findByIdOrFail(id);

// Complex queries with builder
const results = await repos.product.find({
  where: (qb) => qb.where("price", ">", 100),
  modify: (qb) => qb.orderBy("createdAt", "desc").limit(20)
});
```

### Data Fetching Pattern

```typescript
// Route loader — prefetch for SSR
loader: async ({ context }) => {
  context.queryClient.prefetchQuery(orpc.product.list.queryOptions({ input: { page: 1 } }));
}

// Component — consume with cache
const { data, refetch } = useSuspenseQuery(orpc.product.list.queryOptions({ input: { page } }));
```

### Background Tasks

```typescript
// Lightweight tasks (analytics, webhooks) — use context.waitUntil
context.waitUntil(trackAnalytics({ event: "product_created" }));

// Long-running tasks (exports, emails, reports) — use Job Queue
// See docs/job-queue-worker.md
```

---

## Documentation

| Topic | Doc | When to Read |
|-------|-----|--------------|
| Architecture | [docs/shell-spa-architecture.md](docs/shell-spa-architecture.md) | Understanding project structure |
| Routing | [docs/tanstack-start.md](docs/tanstack-start.md) | Adding pages, route guards |
| RPC Layer | [docs/rpc-architecture.md](docs/rpc-architecture.md) | Creating API endpoints |
| Database | [docs/database-repository.md](docs/database-repository.md) | DB queries, repositories |
| DB Schema | [docs/db-schema.md](docs/db-schema.md) | Current schema reference |
| Job Queue | [docs/job-queue-worker.md](docs/job-queue-worker.md) | Background tasks |
| Feature Development | [docs/development-guides.md](docs/development-guides.md) | Full CRUD implementation |
| React Conventions | [docs/react-conventions.md](docs/react-conventions.md) | React code conventions |
| Example CRUD Blog | [docs/example-crud-blog.md](docs/example-crud-blog.md) | CRUD implementation example |
| UI/UX | [docs/ui-guidelines.md](docs/ui-guidelines.md) | Forms, dialogs, tables |
| Utilities | [docs/utilities.md](docs/utilities.md) | Date, lodash utils |
| File Storage | [docs/file-storage.md](docs/file-storage.md) | S3, file uploads |
| Commands | [docs/commands.md](docs/commands.md) | Available CLI commands |
| DevOps | [docs/devops.md](docs/devops.md) | Deployment |
| Cloudflare | [docs/cloudflare.md](docs/cloudflare.md) | Cloudflare Workers |
