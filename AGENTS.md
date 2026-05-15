# AGENTS.md

Agent-only working reference for this repo. Read this first, then open only the task-specific docs you need.

## Non-Negotiables

- RPC is **oRPC**, not tRPC.
- UI primitives are **Base UI** (`@base-ui/react`), not Radix. Use the `render` prop, never `asChild`.
- React Compiler is enabled. Do **not** add `useCallback`, `useMemo`, or `memo`.
- Tailwind is v4. Use theme tokens such as `bg-primary`, `text-muted-foreground`, and `border-border`. Avoid literal colors unless the user asks.
- Biome owns formatting and linting. End every task with `pnpm check`.
- Do not add tests unless the user explicitly asks.
- Do not add seed files.
- Do not use Kysely codegen. Schema types are handwritten in `src/server/db/schema/`.
- Do not customize `src/components/ui/*` directly for app-specific behavior. Copy upstream code into an app-level component if needed.
- Do not use optimistic updates. Refetch or use another concurrency-safe strategy.
- All app data changes go through the RPC layer. Inside handlers, prefer `context.repos` over raw Kysely.
- After every migration, update `docs/db-schema.md`.

## Live Baseline

- User feature: `/app/todo`
- Admin feature: `/admin/users`
- API routes: `/api/auth/$`, `/api/rpc/$`, `/api/upload/$`
- RPC domains: `app`, `auth`, `todo`, `user`
- Current repositories: `repos.user`, `repos.todoItem`
- The `job` table exists, but a dedicated worker runtime is **not** checked into the current tree.

## Key Files

- Root shell: `src/routes/__root.tsx`
- User auth boundary: `src/routes/(user)/route.tsx`
- Admin auth boundary: `src/routes/admin/route.tsx`
- RPC client: `src/lib/orpc.ts`
- Shared query options: `src/lib/queries.ts`
- RPC procedures: `src/server/rpc/base.ts`
- RPC router: `src/server/rpc/router.ts`
- Server context: `src/server/context.ts`
- Repository base: `src/server/db/repositories/repository.ts`
- Repository types: `src/server/db/repositories/types.ts`
- DB schema index: `src/server/db/schema/index.ts`
- Reference user page: `src/routes/(user)/app/todo.tsx`
- Reference admin page: `src/routes/admin/users.tsx`

## Working Order

1. Read the relevant docs in `docs/`.
2. Inspect at least one existing file that matches the task.
3. Implement in this order when applicable:
   DB migration -> schema types -> repository wiring -> RPC handler -> route loader/page -> UI -> navigation -> `pnpm check`

## Architecture Rules

- The app uses a shell-SPA pattern: SSR only the shell and auth bootstrap, then let TanStack Router + Query drive the client app.
- Root shell data is loaded in `src/routes/__root.tsx` via `shellQueryOptions()`.
- Auth state is read through `authQueryOptions()` and enforced in route-group `beforeLoad` hooks.
- Client components should use `orpc.<domain>.<action>.queryOptions()` or `.mutationOptions()`.
- Prefer TanStack Query (`useQuery` / `useMutation`) over manual `useState` + `useEffect` for any server or async state. Only use `useState` for purely local UI state.
- Only pass serialized values into RPC inputs.
- Route-adjacent support modules live in sibling folders prefixed with `-`.

## UI Rules

- Base UI trigger pattern:

```tsx
<DialogTrigger render={<Button />}>Open</DialogTrigger>
```

- CRUD surface:
  - 1-3 fields: `Dialog`
  - 4-5 fields: `Sheet`
  - 6+ fields: dedicated route
- Each list item should own its own mutation state when practical.

## Commands

```bash
pnpm dev
pnpm build
pnpm check
pnpm kysely migrate latest
pnpm kysely migrate make <name>
pnpm ui add <component>
pnpm auth:secret
pnpm auth:generate
```

## Doc Map

- `docs/better-spa-architecture.md`: route and shell model
- `docs/rpc-architecture.md`: oRPC handler and client patterns
- `docs/database-repository.md`: schema and repository usage
- `docs/tanstack-start.md`: route groups, loaders, API routes
- `docs/react-conventions.md`: React Compiler-safe component patterns
- `docs/ui-guidelines.md`: Base UI, forms, tables, theming
- `docs/development-guides.md`: implementation checklist for features
- `docs/example-crud-blog.md`: compact CRUD template
- `docs/file-storage.md`: S3 and upload patterns
- `docs/db-schema.md`: current DB snapshot
