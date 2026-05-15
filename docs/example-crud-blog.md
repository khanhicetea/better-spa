# Example CRUD Feature: Blog Posts

Compact template for adding a new CRUD domain. This is a pattern reference, not a live feature in the current app.

## Use This Order

1. Migration
2. Schema types
3. Repository
4. RPC handlers
5. Router entry
6. Route loader and page
7. Form and delete UI
8. Navigation
9. `pnpm check`

## 1. Migration

Create a table under `src/server/db/migrations/` with:

- `id` as `text`
- foreign keys with explicit delete/update behavior
- `created_at` and `updated_at`
- indexes for common filters or ordering

If the feature stores files, use `jsonb` for persisted S3 metadata.

## 2. Schema Types

Add `src/server/db/schema/<domain>.ts`:

- `<Domain>Table`
- `<Domain>`
- `<Domain>Insert`
- `<Domain>Update`

Then register the table in `src/server/db/schema/index.ts`.

## 3. Repository

If base repository methods are enough, wire a generic `Repository` in `src/server/db/repositories/index.ts`.

If you need reusable complex queries, add `src/server/db/repositories/<domain>.repo.ts` and register it in the factory.

## 4. RPC Handlers

Create `src/server/rpc/handlers/<domain>.ts` with the usual actions:

- `list`
- `get`
- `create`
- `update`
- `remove`

Typical handler concerns:

- input validation
- auth or admin enforcement
- ownership checks
- `generateUUID()` for new rows
- `updatedAt: new Date()` on writes

## 5. Router Entry

Register the domain in `src/server/rpc/router.ts` and choose the client-facing names carefully.

Example:

```ts
blog: {
  list: blog.list,
  get: blog.get,
  create: blog.create,
  update: blog.update,
  delete: blog.remove,
}
```

## 6. Route and Loader

- Put the page in the correct route group.
- Validate search params if pagination or filters exist.
- Prefetch in the loader with the same query options used in the component.

## 7. UI Pattern

- List page for browsing
- `Dialog` or `Sheet` for create/edit depending on form size
- `AlertDialog` for delete
- One item component per row/card if each item has independent mutation state

## 8. Files

If the feature stores uploads:

- Persist serialized `PublicS3File` or `PrivateS3Files`
- For private files, resolve read URLs in the RPC response
- Never persist browser `File` objects

## 9. Final Checks

- Add sidebar link if it is a navigable feature
- Update `docs/db-schema.md` if the DB changed
- Run `pnpm check`
