# RPC Handlers

One file per domain. Each file exports short server actions: `list`, `get`, `create`, `update`, `remove`, plus domain-specific verbs.

## Conventions

- Pick the right procedure base from `../base`:
  - `baseProcedure` / `publicProcedure` — open
  - `authedProcedure` — `context.user` is required
  - `adminProcedure` — admin user is required
- Validate every input with `zod`. Skip `.input(...)` only when there are no params.
- Read and write data through `context.repos`. Reach for raw `context.db` only when a query has no repository equivalent.
- Enforce ownership in the handler, not the UI. For per-row writes, refetch the row and compare `row.userId` to `context.user.id` before mutating.
- Throw via the typed errors map: `errors.NOT_FOUND()`, `errors.UNAUTHORIZED()`, `errors.RATE_LIMITED({ data: { retryAfter } })`.
- Generate ids with `generateUUID()` from `@/lib/helpers/data`. Set `createdAt` and `updatedAt` on insert; set `updatedAt: new Date()` on update.
- Return serialized data only (no class instances, `Map`, `Set`, `File`, etc.). Dates are fine; oRPC serializes them.

## Wiring a New Action

1. Add or update the handler file here.
2. Register and (optionally) alias it in `../router.ts`. Aliases are how `todo.remove` becomes `todo.delete` and `todo.exportData` becomes `todo.export`.
3. Call from the client via `orpc.<domain>.<action>.queryOptions(...)` or `.mutationOptions(...)`.

## Reference

- Compact CRUD walkthrough: `docs/example-crud-blog.md`
- Handler template: `docs/example-rpc-handler.md`
- Architecture: `docs/rpc-architecture.md`
- Live reference handler: `todo.ts`
