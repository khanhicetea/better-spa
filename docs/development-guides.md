# Development Guides

## Before coding

1. Read `AGENTS.md`.
2. Read only task-relevant docs.
3. Inspect a live reference.
4. Match current package boundaries and patterns.

Useful references:

- user feature: `apps/web/src/routes/(user)/app/todo.tsx`
- admin feature: `apps/web/src/routes/admin/users.tsx`
- RPC handlers: `packages/rpc/src/handlers/todo.ts`,
  `packages/rpc/src/handlers/user.ts`
- focused repositories: `packages/db/src/repositories/todo.ts`,
  `packages/db/src/repositories/user.ts`

## Standard feature order

Use only the applicable steps:

1. Drizzle table definition and generated SQL migration
2. inferred schema types
3. focused repository and factory wiring
4. explicit RPC input/output and handler
5. router entry
6. route loader and page
7. route-owned UI
8. navigation
9. `pnpm check`

## Data and writes

- Use the same query options in the loader and component.
- Await data required by suspense rendering.
- Put invalidation in a feature-owned query module.
- Trigger mutations in the component that owns the interaction.
- Do not use optimistic updates.
- Validate RPC input and serialize output.
- Enforce auth and ownership server-side; prefer ownership-scoped SQL mutations.
- Surface expected failures in the form or a toast.
- Use `context.waitUntil` only for lightweight best-effort work.

## Completion checklist

- schema/migration/repository changes agree
- RPC handler has explicit serialized output
- router and loader are wired
- bootstrap is invalidated if identity or profile state changes
- navigation is updated when a route is user-visible
- `pnpm db:snapshot` ran after migration changes
- relevant runtime build succeeds
- `pnpm check` is green and remains read-only

Prefer direct feature code over speculative shared abstractions.
