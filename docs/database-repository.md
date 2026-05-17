# Database and Repository Pattern

Rules for DB work in this repo.

## Non-Negotiables

- No Kysely codegen.
- Schema types are handwritten in `src/server/db/schema/`.
- Prefer `context.repos` in handlers.
- Use raw `db` only when the repository abstraction is clearly the wrong fit.

## Live Structure

```text
src/server/db/
  client.ts
  migrate.ts
  index.ts
  schema/
    auth.ts
    todo.ts
    job.ts
    index.ts
  repositories/
    index.ts
    repository.ts
    types.ts
  migrations/
```

## Schema Rules

- Each schema file should export `<Name>Table`, `<Name>`, `<Name>Insert`, and `<Name>Update`.
- SQL tables are singular: `user`, `session`, `todo_item`, `job`.
- TypeScript table keys are camelCase: `user`, `todoItem`, `job`.
- Use `snake_case` in raw SQL and `camelCase` in Kysely code.

## Repositories

Current live repos:

- `repos.user`
- `repos.todoItem`

Base repository files:

- `src/server/db/repositories/index.ts`
- `src/server/db/repositories/repository.ts`
- `src/server/db/repositories/types.ts`

Use the built-in methods before adding custom repository code:

- `find`
- `findSelect`
- `findById`
- `findByIdOrFail`
- `findOne`
- `findPaginated`
- `count`
- `exists`
- `existsBy`
- `insertReturn`
- `insertMany`
- `updateById`
- `updateMany`
- `deleteById`
- `deleteMany`
- `upsert`

## When to Add a Custom Repo

Add a custom repository class only for reusable or complex logic.

- Good: search logic, cross-table workflow, transaction helper
- Bad: thin wrappers over `find({ where })`

If you add one:

1. create `src/server/db/repositories/<name>.repo.ts`
2. register it in `src/server/db/repositories/index.ts`
3. update `src/server/db/schema/index.ts` if a new table was added

## Migration Flow

1. create the migration in `src/server/db/migrations/`
2. update schema types in `src/server/db/schema/`
3. wire repository access if needed
4. update `docs/db-schema.md`

## Handler Rule

Most handlers should stay simple:

1. validate input
2. load via `context.repos`
3. enforce auth or ownership
4. write changes
5. return serialized data
