# Example CRUD Feature: Blog Posts

Pattern reference for adding a new CRUD domain. This is not a live feature.

## Build Order

1. Migration
2. Schema types
3. Repository
4. RPC handlers
5. Router entry
6. Route loader and page
7. UI
8. Navigation
9. `pnpm check`

## Migration

- Create the table in `src/server/db/migrations/`
- Use `id: text`
- Add explicit FK delete and update behavior
- Add `created_at` and `updated_at`
- Add indexes for common filters and ordering
- Use `jsonb` for persisted file metadata when needed

## Schema and Repo

- Add `src/server/db/schema/<domain>.ts`
- Export `<Domain>Table`, `<Domain>`, `<Domain>Insert`, `<Domain>Update`
- Register the table in `src/server/db/schema/index.ts`
- Use the generic `Repository` unless the domain needs reusable complex queries

## RPC

- Add `src/server/rpc/handlers/<domain>.ts`
- Typical actions: `list`, `get`, `create`, `update`, `remove`
- Validate input, enforce auth or admin access, and enforce ownership where needed
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

- Persist serialized `PublicS3File` or `PrivateS3Files`
- Never persist browser `File` objects
- Resolve private file URLs in the RPC response

## Final Checks

- Add navigation if the feature is user-facing
- Update `docs/db-schema.md` if the DB changed
- Run `pnpm check`
