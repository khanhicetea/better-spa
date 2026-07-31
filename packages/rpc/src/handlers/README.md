# RPC Handlers

One file per domain. Each file exports short server actions: `list`, `get`, `create`, `update`, `remove`, plus domain-specific verbs.

## Conventions

- Pick the right procedure base from `../base`:
  - `baseProcedure` — open
  - `authedProcedure` — `context.user` is required
  - `adminProcedure` — admin user is required
- Validate every input with `zod`. Skip `.input(...)` only when there are no params.
- Read and write data through `context.repos`. Reach for raw `context.db` only when a query has no repository equivalent.
- Enforce ownership in the handler, not the UI. For per-row writes, use a repository method that includes `userId` in the SQL mutation predicate.
- Throw via the typed errors map: `errors.NOT_FOUND()`, `errors.UNAUTHORIZED()`, `errors.RATE_LIMITED({ data: { retryAfter } })`.
- Generate IDs with `generateUUID()` from `@better-spa/shared/helpers/data`. Set `createdAt` and `updatedAt` on insert; set `updatedAt: new Date()` on update.
- Declare an output schema and return serialized data only. Dates cross RPC as ISO strings.

## Wiring a New Action

1. Add or update the handler file here.
2. Register and optionally alias it in `../router.ts`; for example, `todo.remove` is exposed as `todo.delete`.
3. Call from the client via `orpc.<domain>.<action>.queryOptions(...)` or `.mutationOptions(...)`.

## Reference

- Architecture: `docs/rpc-architecture.md`
- Live user handler: `todo.ts`
- Live admin handler: `user.ts`
