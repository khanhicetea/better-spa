# RPC Architecture

Compact oRPC reference. This project does **not** use tRPC.

## Files

```text
src/rpc/
  base.ts
  middlewares.ts
  router.ts
  handlers/
    app.ts
    auth.ts
    todo.ts
    user.ts
```

## Procedure Types

- `baseProcedure`: request context + rate limiting
- `publicProcedure`: alias of `baseProcedure`
- `authedProcedure`: authenticated user required
- `adminProcedure`: admin user required

The live context includes:

- `headers`
- `session`
- `db`
- `auth`
- `repos`
- `waitUntil`

## Current RPC Surface

- `app.shellData`
- `auth.getCurrentUser`
- `todo.list`
- `todo.create`
- `todo.update`
- `todo.delete`
- `todo.export`
- `user.list`
- `user.get`

Router aliases matter. For example, `todo.remove` is exported to the client as `todo.delete`.

## Handler Rules

- One handler file per domain.
- Export short action names: `list`, `get`, `create`, `update`, `remove`.
- Validate all input with `zod`.
- Prefer `context.repos` for data access.
- Enforce ownership checks inside the handler, not only in the UI.
- Return plain serialized objects.

## Handler Template

```ts
export const list = authedProcedure
  .input(z.object({ page: z.number().int().positive().catch(1) }))
  .handler(async ({ input, context }) => {
    return context.repos.todoItem.findPaginated({
      page: input.page,
      pageSize: 20,
      where: { userId: context.user.id },
      modify: (qb) => qb.orderBy("createdAt", "desc"),
    });
  });
```

## Client Usage

In loaders, prefetch with the same query options the component will use:

```ts
loader: async ({ context }) => {
  context.queryClient.prefetchQuery(orpc.user.list.queryOptions({
    input: { page: 1 },
  }));
}
```

In components:

```ts
const { data, refetch } = useSuspenseQuery(
  orpc.user.list.queryOptions({ input: { page } }),
);

const mutation = useMutation(
  orpc.todo.create.mutationOptions({
    onSuccess: () => refetch(),
  }),
);
```

## Error and Background Rules

- Use typed procedure errors such as `errors.NOT_FOUND()` when available.
- Use `waitUntil` only for lightweight best-effort work.
- Do not hide long-running user-facing work inside `waitUntil`.

## Common Mistakes

- Do not write tRPC-style routers or hooks.
- Do not pass functions, `Date` instances from uncontrolled inputs, or class instances as RPC input.
- Do not invalidate optimistically by default; refetch from the component that owns the data.
