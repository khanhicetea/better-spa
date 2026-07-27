# Database and Repository Pattern

## Rules

- Handwrite schema types in `packages/db/src/schema/`; do not use Kysely codegen.
- Prefer `context.repos` in RPC handlers.
- Use raw `context.db` only when a focused repository method would be less clear.
- Generic bulk update/delete requires a non-empty condition.
- After every migration, regenerate `docs/db-schema.md` with `pnpm db:snapshot`.

## Live structure

```text
packages/db/
  src/client.ts
  src/migrate.ts
  src/migrations/
  src/schema/
    auth.ts
    todo.ts
    index.ts
  src/repositories/
    index.ts
    repository.ts
    todo.ts
    user.ts
    types.ts
```

Current repositories from `createRepos()`:

- `repos.user`, including the shared-filter `listAdminPage`
- `repos.todoItem`, including ownership-scoped `updateOwned` and `deleteOwned`

The deployed migration history may mention `job`, but no job table/type/repository exists
in the current application. Do not build on it without a new migration and real worker
design.

## Schema conventions

- Each schema file exports table row, insert, and update types.
- SQL tables are singular: `user`, `session`, `account`, `verification`, `todo_item`.
- Database identifiers use `snake_case`; TypeScript fields use `camelCase`.
- RPC DTOs are separate from database rows.

## Migration flow

1. add a migration in `packages/db/src/migrations/`
2. update `packages/db/src/schema/*`
3. update `packages/db/src/schema/index.ts`
4. add or update focused repositories
5. wire `packages/db/src/repositories/index.ts`
6. run the migration and snapshot

```bash
pnpm db:migrate
pnpm db:snapshot
pnpm check
```

`db:snapshot` reads the live database and is the only supported way to update
`docs/db-schema.md`.
