# Development Guides

Compact implementation checklist for agents.

## Before You Code

1. Read `AGENTS.md`.
2. Read only the docs relevant to the task.
3. Inspect at least one live reference file.
4. Match existing patterns before inventing a new one.

## High-Signal Reference Files

- User feature baseline: `src/routes/(user)/app/todo.tsx`
- Admin list baseline: `src/routes/admin/users.tsx`
- RPC patterns: `src/rpc/handlers/todo.ts`, `src/rpc/handlers/user.ts`
- Repository API: `src/server/db/repositories/base.ts`

## Standard Build Order

1. Migration
2. Schema types
3. Repository wiring
4. RPC handlers
5. Route loader and page
6. UI composition
7. Sidebar link if needed
8. `pnpm check`

## Rules That Matter

- No optimistic updates by default.
- Validate every RPC input with `zod`.
- Enforce auth and ownership in RPC handlers.
- Prefer refetch after mutation.
- Keep one-off subcomponents inside the route file unless reuse is clear.
- Add a `-folder` when a route grows too large.

## New Feature Checklist

- Migration created if the schema changes
- `src/server/db/schema/*` updated
- `src/server/db/schema/index.ts` updated
- Repository factory updated if adding a new repo
- RPC handler added
- RPC router entry added
- Loader prefetch added when the page needs SSR hydration
- Sidebar entry added for new user/admin pages
- `docs/db-schema.md` updated if DB changed

## Data Fetching Pattern

Use the same query options in both places:

```ts
loader: async ({ context }) => {
  context.queryClient.prefetchQuery(
    orpc.user.list.queryOptions({
      input: { page: 1 },
    }),
  );
};

const { data, refetch } = useSuspenseQuery(orpc.user.list.queryOptions({ input: { page } }));
```

## Mutation Pattern

- Trigger mutation from the component that owns the interaction
- On success, refetch the relevant query or reset local state
- Surface errors in the form or toast, depending on the UX

## When Not to Generalize

Do not build extra abstractions just because a pattern might repeat later. This codebase prefers direct, readable implementations.
