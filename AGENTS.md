# AGENTS.md

Agent reference for this repository. Read this first, then open only the task-specific docs
you need.

## Core rules

- RPC is oRPC, not tRPC.
- UI primitives are `@base-ui/react`, not Radix. Use `render`, never `asChild`.
- React Compiler is enabled. Do not add `useMemo`, `useCallback`, or `memo`.
- Tailwind is v4. Prefer theme tokens such as `bg-primary`, `bg-muted`,
  `text-muted-foreground`, and `border-border`.
- Oxlint owns linting. Prettier owns formatting.
- End every task with `pnpm check`.
- Do not add tests unless the user asks.
- Do not add seed files.
- Drizzle table definitions in `packages/db/src/schema/` are the schema source of truth.
- Do not customize `apps/web/src/components/ui/*` for app-specific behavior. Copy
  upstream code into an app-level component.
- Do not use optimistic updates. Invalidate/refetch or use another concurrency-safe
  pattern.
- All application writes go through oRPC.
- Better Auth HTTP remains the boundary for ordinary sign-in, sign-up, sign-out, session,
  and account lifecycle operations.
- In RPC handlers, prefer `context.repos` over raw Drizzle queries.
- Dates crossing RPC use ISO strings and public handlers declare output schemas.
- Generate and review Drizzle SQL migrations; do not use `drizzle-kit push`.
- After every migration, run `pnpm db:snapshot`; never hand-edit `docs/db-schema.md`.

## Start order

1. Read only the docs relevant to the task.
2. Inspect at least one live file that matches the intended pattern.
3. When applicable, build in this order:
   migration -> schema types -> repository wiring -> RPC handler -> router entry -> route
   loader/page -> UI -> navigation -> `pnpm check`.

## Current baseline

- User feature: `/app/todo`
- Admin feature: `/admin/users`
- API routes: `/api/auth/$`, `/api/rpc/$`, `/api/health/live`,
  `/api/health/ready`
- RPC domains: `app`, `file`, `todo`, `user`
- Repositories: `repos.user`, `repos.todoItem`
- Runtime targets: Node 24 and Cloudflare Workers
- There is no job table or dedicated background-worker system in the live schema

## Architecture

- The root loader in `apps/web/src/routes/__root.tsx` loads
  `bootstrapQueryOptions()` for the canonical `app.bootstrap` payload.
- Auth, admin guards, navigation, theme initialization, OAuth controls, and upload
  availability all derive from bootstrap.
- Invalidate bootstrap after any auth/session/profile/account/impersonation transition.
- Current shell-SPA branches:
  - `/app/*` via `apps/web/src/routes/(user)/app/route.tsx`
  - `/admin/*` via `apps/web/src/routes/admin/route.tsx`
- Client data access uses `orpc.<domain>.<action>.queryOptions()` or
  `.mutationOptions()`.
- Prefer TanStack Query for server state. Use `useState` only for local UI state.
- Only serialized DTOs cross the RPC boundary.
- Route-adjacent support code belongs in a sibling `-folder`.
- Feature-owned query modules own invalidation; do not thread `refetch` callbacks through
  component trees.
- Use `context.waitUntil` only for lightweight post-response work. No durable background
  worker is implied.

## Runtime and security

- `packages/rpc/src/context.ts` owns the runtime-neutral request context.
- Node keeps process-level DB/auth/repository/storage/rate-limit resources and destroys
  them during graceful shutdown.
- Workers create and destroy request-scoped PostgreSQL resources using `HYPERDRIVE`.
- Do not cache Worker request-bound DB clients globally.
- Workers rely on Cloudflare ingress rate-limit rules.
- Upload buckets must remain private. Only issue intents for the authenticated user's
  `users/{userId}/` prefix.
- Never log cookies, authorization, passwords, OAuth tokens, database URLs, or storage
  credentials.

## UI

- 1–3 fields: `Dialog`
- 4–5 fields: `Sheet`
- 6+ fields or multi-step flows: dedicated route
- Destructive confirmation: `AlertDialog`
- Each list item should own its mutation state when practical.
- Keep list/table actions in the last column.
- Use `lucide-react` icons.

## Key files

- Root shell: `apps/web/src/routes/__root.tsx`
- Shell components: `apps/web/src/components/shell/`
- User auth boundary: `apps/web/src/routes/(user)/route.tsx`
- Admin auth boundary: `apps/web/src/routes/admin/route.tsx`
- RPC client: `apps/web/src/lib/orpc.ts`
- Bootstrap query: `apps/web/src/lib/queries.ts`
- RPC base/router: `packages/rpc/src/base.ts`, `packages/rpc/src/router.ts`
- Request context: `packages/rpc/src/context.ts`
- DTOs: `packages/rpc/src/dto.ts`
- DB schema/repositories: `packages/db/src/schema/`,
  `packages/db/src/repositories/`
- Node/Worker adapters: `apps/web/src/server/node-server.ts`,
  `apps/web/src/server/cloudflare-worker.ts`
- User/admin references: `apps/web/src/routes/(user)/app/todo.tsx`,
  `apps/web/src/routes/admin/users.tsx`

## Docs map

- `docs/better-spa-architecture.md`: shell, bootstrap, auth boundaries
- `docs/rpc-architecture.md`: oRPC context, DTOs, errors, write boundaries
- `docs/database-repository.md`: schema, repositories, migrations
- `docs/tanstack-start.md`: route groups, loaders, API routes
- `docs/react-conventions.md`: React Compiler-safe patterns
- `docs/ui-guidelines.md`: Base UI, CRUD surfaces, forms, navigation
- `docs/development-guides.md`: feature checklist and order
- `docs/example-crud-blog.md`: compact CRUD template
- `docs/file-storage.md`: private S3/R2 upload intents
- `docs/db-schema.md`: generated database snapshot
- `docs/commands.md`: root scripts and quality gates
- `docs/devops.md`: Node deployment and health checks
- `docs/cloudflare.md`: Worker build, bindings, and deployment

## Common commands

```bash
pnpm dev
pnpm build:node
pnpm build:worker
pnpm db:migrate
pnpm db:snapshot
pnpm auth:secret
pnpm auth:generate
pnpm ui add <component>
pnpm check
pnpm check:full
```
