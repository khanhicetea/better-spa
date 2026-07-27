# Example CRUD Feature: Blog Posts

Pattern reference for adding a new CRUD domain. This is not a live feature.

## Build Order

1. migration
2. schema types
3. repository wiring
4. RPC handlers
5. router entry
6. route loader and page
7. UI
8. navigation
9. `pnpm check`

## Migration

- Create the table in `packages/db/src/migrations/`
- Use `id text primary key`
- Add explicit FK delete and update behavior
- Add `created_at` and `updated_at`
- Add indexes for common filters and ordering
- Use `jsonb` for persisted file metadata when needed
- Run `pnpm db:migrate` and `pnpm db:snapshot` when applying locally

## Schema and Repo

- Add `packages/db/src/schema/<domain>.ts`
- Export `<Domain>Table`, `<Domain>`, `<Domain>Insert`, `<Domain>Update`
- Register the table in `packages/db/src/schema/index.ts`
- Use the generic `Repository` unless the domain needs reusable complex queries

## RPC

- Add `packages/rpc/src/handlers/<domain>.ts`
- Typical actions: `list`, `get`, `create`, `update`, `remove`
- Validate input, declare serialized output, and enforce auth or admin access
- Put ownership into repository SQL predicates for update and delete
- Use `generateUUID()` for new rows
- Set `updatedAt: new Date()` on writes

Easy mistake: router aliases matter.

```ts
blog: {
  list: blog.list,
  get: blog.get,
  create: blog.create,
  update: blog.update,
  delete: blog.remove,
}
```

## Route and UI

- Put the page in the correct route group
- Validate search params if filters or pagination exist
- Prefetch in the loader with the same query options used in the component
- Use `Dialog` for 1-3 fields, `Sheet` for 4-5, dedicated routes for larger flows
- Use `AlertDialog` for delete
- Keep one item component per row or card when each item has its own mutation state

## Files

- Request private upload intents through `file.createUploadIntents`
- Persist stable serialized metadata only
- Never persist browser `File` objects
- Request short-lived reads through `file.createReadUrl`

## Final Checks

- Add navigation if the feature is user-facing
- Run `pnpm db:snapshot` if the DB changed
- Run `pnpm check`
