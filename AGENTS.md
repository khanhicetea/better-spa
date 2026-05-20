# AGENTS.md

Agent reference for this repo. Read this first, then open only the task-specific docs you need.

## Core Rules

- RPC is `oRPC`, not tRPC.
- UI primitives are `@base-ui/react`, not Radix. Use `render`, never `asChild`.
  Example: `<DialogTrigger render={<Button />}>Open</DialogTrigger>`
- React Compiler is enabled. Do not add `useMemo`, `useCallback`, or `memo`.
- Tailwind is v4. Prefer theme tokens such as `bg-primary`, `bg-muted`, `text-muted-foreground`, and `border-border`.
- Oxlint owns linting. Prettier owns formatting.
- End every task with `pnpm check`.
- Do not add tests unless the user asks.
- Do not add seed files.
- Do not use Kysely codegen. Schema types are handwritten in `src/server/db/schema/`.
- Do not customize `src/components/ui/*` for app-specific behavior. Copy upstream code into an app-level component instead.
- Do not use optimistic updates. Refetch or use another concurrency-safe pattern.
- All app writes go through the RPC layer.
- In RPC handlers, prefer `context.repos` over raw Kysely.
- After every migration, regenerate `docs/db-schema.md` with `pnpm db:snapshot` (do not hand-edit).

## Start Order

1. Read only the docs relevant to the task.
2. Inspect at least one live file that already matches the pattern.
3. Follow this build order when applicable:
   migration -> schema types -> repository wiring -> RPC handler -> router entry -> route loader/page -> UI -> navigation -> `pnpm check`

## Current Baseline

- User feature baseline: `/app/todo`
- Admin feature baseline: `/admin/users`
- API routes: `/api/auth/$`, `/api/rpc/$`, `/api/upload/$`
- RPC domains: `app`, `auth`, `todo`, `user`
- Current repositories: `repos.user`, `repos.todoItem`
- The `job` table exists, but there is no dedicated worker runtime checked into the repo

## Architecture

- The app uses a shell-SPA model: SSR the shell, then let TanStack Router + Query drive SPA branches.
- Root shell data is loaded in `src/routes/__root.tsx` with `shellQueryOptions()`.
- Auth state is loaded with `authQueryOptions()` and enforced in route-group `beforeLoad` hooks.
- Current SPA branches:
  - `/app/*` via `src/routes/(user)/app/route.tsx`
  - `/admin/*` via `src/routes/admin/route.tsx`
- Client data access should use `orpc.<domain>.<action>.queryOptions()` or `.mutationOptions()`.
- Prefer TanStack Query for server state. Use `useState` only for local UI state.
- Only pass serialized values across the RPC boundary.
- Route-adjacent support code belongs in a sibling `-folder`.
- Use `context.waitUntil` only for lightweight post-response work. Do not assume a background worker runtime exists.

## UI

- CRUD surface choice:
  - 1-3 fields: `Dialog`
  - 4-5 fields: `Sheet`
  - 6+ fields or multi-step flows: dedicated route
- Destructive confirmation: `AlertDialog`
- Each list row/item should own its own mutation state when practical.
- For tables and lists, keep actions in the last column.
- Use `lucide-react` for icons.

## Key Files

- Root shell: `src/routes/__root.tsx`
- User auth boundary: `src/routes/(user)/route.tsx`
- Admin auth boundary: `src/routes/admin/route.tsx`
- RPC client: `src/lib/orpc.ts`
- Shared query options: `src/lib/queries.ts`
- RPC base: `src/server/rpc/base.ts`
- RPC router: `src/server/rpc/router.ts`
- Server context: `src/server/context.ts`
- DB schema index: `src/server/db/schema/index.ts`
- Repository factory: `src/server/db/repositories/index.ts`
- Repository base: `src/server/db/repositories/repository.ts`
- User reference page: `src/routes/(user)/app/todo.tsx`
- Admin reference page: `src/routes/admin/users.tsx`

## Docs Map

Open only what matches the task.

- `docs/better-spa-architecture.md`: shell-SPA boundaries, auth boundaries, route surface
- `docs/rpc-architecture.md`: oRPC handlers, router aliases, client query patterns
- `docs/database-repository.md`: schema files, repositories, migrations
- `docs/tanstack-start.md`: route groups, loaders, API route shape
- `docs/react-conventions.md`: React Compiler-safe component patterns
- `docs/ui-guidelines.md`: Base UI rules, CRUD surfaces, forms, tables, navigation
- `docs/development-guides.md`: feature checklist and implementation order
- `docs/example-crud-blog.md`: compact CRUD template
- `docs/file-storage.md`: upload routes, S3 metadata, RPC/file patterns
- `docs/job-queue-worker.md`: job table usage and queue guidance
- `docs/db-schema.md`: live database snapshot
- `docs/commands.md`: scripts and quality commands
- `docs/devops.md`: Node deployment baseline and required env
- `docs/cloudflare.md`: Cloudflare-specific adaptations
- `docs/utilities.md`: date and utility helpers

## Common Commands

```bash
pnpm dev
pnpm build
pnpm check
pnpm kysely migrate make <name>
pnpm kysely migrate latest
pnpm ui add <component>
pnpm auth:secret
pnpm auth:generate
```
