# RPC Architecture

oRPC reference for this repo. Do not write tRPC-style code here.

## Live Files

```text
src/server/rpc/
  base.ts
  middlewares.ts
  router.ts
  handlers/
    app.ts
    auth.ts
    todo.ts
    user.ts
```

## Procedures

- `baseProcedure`: request context + rate limiting
- `publicProcedure`: alias of `baseProcedure`
- `authedProcedure`: authenticated user required
- `adminProcedure`: admin user required

Live context includes:

- `headers`
- `session`
- `db`
- `auth`
- `repos`
- `waitUntil`

## Handler Rules

- One handler file per domain.
- Export short action names such as `list`, `get`, `create`, `update`, `remove`.
- Validate all input with `zod`.
- Prefer `context.repos`.
- Enforce ownership and auth inside the handler.
- Return plain serialized objects.

## Live RPC Surface

- `app.shellData`
- `auth.getCurrentUser`
- `todo.list`
- `todo.create`
- `todo.update`
- `todo.delete`
- `todo.export`
- `user.list`
- `user.get`

Easy mistake: router aliases matter. `todo.remove` is exported to the client as `todo.delete`.

## Client Pattern

- In loaders, prefetch with the same query options the component will use.
- In components, read with `useSuspenseQuery(...)`.
- Mutate with `useMutation(...)`.
- Refetch from the screen that owns the data.

## Background and Errors

- Use typed procedure errors when available.
- Use `waitUntil` only for lightweight best-effort work.
- Do not hide long-running user-facing work inside `waitUntil`.

## Common Mistakes

- writing tRPC-style routers or hooks
- passing non-serializable values across the RPC boundary
- enforcing ownership only in the UI
- defaulting to optimistic invalidation instead of refetch
