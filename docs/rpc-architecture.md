# RPC Architecture

oRPC only. Do not add tRPC routers, hooks, or naming conventions.

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

Client utilities:

- `src/lib/orpc.ts`: isomorphic client and TanStack Query helpers
- `src/lib/orpc.server.ts`: server-only router client
- `src/routes/api/rpc.$.ts`: HTTP endpoint

## Procedures

- `baseProcedure`: request context and rate limit middleware
- `publicProcedure`: alias of `baseProcedure`
- `authedProcedure`: requires `context.user`
- `adminProcedure`: requires admin user

Live context from `src/server/context.ts`:

- `headers`
- `auth`
- `session`
- `db`
- `repos`
- `waitUntil`

## Handler Rules

- Keep one handler file per domain.
- Export short server action names: `list`, `get`, `create`, `update`, `remove`.
- Validate input with `zod`.
- Prefer `context.repos` over raw Kysely.
- Enforce auth and ownership in the handler.
- Return serialized data only.

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
- `user.updateProfile`

Router aliases matter: `todo.remove` is exposed as `todo.delete`, and `todo.exportData` is exposed as `todo.export`.

## Client Pattern

- Query with `orpc.domain.action.queryOptions(...)`.
- Mutate with `orpc.domain.action.mutationOptions(...)`.
- In loaders, prefetch the same query options used by the component.
- In components, read prefetched data with `useSuspenseQuery(...)`.
- After mutation, refetch or invalidate the screen-owned query.

## Avoid

- non-serializable RPC inputs or outputs
- ownership checks only in UI
- optimistic updates by default
- long-running user-visible work hidden in `waitUntil`
