# Development Guides

Short implementation checklist for agents.

## Before You Code

1. Read `AGENTS.md`.
2. Read only the docs needed for the task.
3. Inspect at least one live reference file.
4. Match existing patterns before adding new abstractions.

## High-Signal References

- User feature baseline: `src/routes/(user)/app/todo.tsx`
- Admin page baseline: `src/routes/admin/users.tsx`
- RPC handlers: `src/server/rpc/handlers/todo.ts`, `src/server/rpc/handlers/user.ts`
- Repository base: `src/server/db/repositories/repository.ts`

## Standard Build Order

1. Migration
2. Schema types
3. Repository wiring
4. RPC handler
5. Router entry
6. Route loader and page
7. UI composition
8. Navigation if needed
9. `pnpm check`

## Rules That Matter

- No optimistic updates by default.
- Validate RPC input with `zod`.
- Enforce auth and ownership in the handler, not only in the UI.
- Prefer refetch after mutation.
- Keep one-off subcomponents in the route file unless reuse is clear.
- Add a sibling `-folder` when a route grows too large.

## Feature Checklist

- Migration added if the schema changed
- `src/server/db/schema/*` updated
- `src/server/db/schema/index.ts` updated
- Repository factory updated if a new repo was added
- RPC handler added
- RPC router entry added
- Loader prefetch added when the page needs hydrated data
- Sidebar entry added for new navigable pages
- `docs/db-schema.md` updated if the DB changed

## Data and Mutations

- Use the same query options in both loader and component.
- Trigger mutations from the component that owns the interaction.
- On success, refetch the owned query or reset local state.
- Surface errors in the form or toast, depending on the UX.

## Do Not Generalize Early

Prefer direct, readable code over speculative abstractions.
