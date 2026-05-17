# Database and Repository Pattern

Rules for DB work in this repo.

## Non-Negotiables

- Do not use Kysely codegen for app schema types.
- Handwrite schema types in `src/server/db/schema/`.
- Prefer `context.repos` in RPC handlers.
- Use raw `context.db` only when the generic repository is a poor fit.

## Live Structure

```text
src/server/db/
  client.ts
  index.ts
  migrate.ts
  tsup.migrate.config.ts
  migrations/
  schema/
    auth.ts
    todo.ts
    index.ts
  repositories/
    index.ts
    repository.ts
    types.ts
```

`src/server/db/schema/job.ts` still exists as legacy code, but the latest migration drops the `job` table. Do not use it for new work unless you reintroduce the table and update this doc set.

## Schema Rules

- Each schema file exports `<Name>Table`, `<Name>`, `<Name>Insert`, and `<Name>Update`.
- SQL tables are singular: `user`, `session`, `account`, `verification`, `todo_item`.
- Kysely table keys are camelCase where needed: `todoItem`.
- Use `snake_case` in SQL and `camelCase` in TypeScript.

## Repositories

Current live repos from `createRepos()`:

- `repos.user`
- `repos.todoItem`

Use built-in methods before adding custom repository code:

- `find`, `findSelect`, `findAll`
- `findById`, `findByIdOrFail`
- `findOne`, `findOneOrFail`
- `findPaginated`
- `count`, `exists`, `existsBy`
- `insertReturn`, `insertMany`, `upsert`
- `updateById`, `updateMany`
- `deleteById`, `deleteMany`

Add a custom repository only for reusable complex logic such as search, cross-table workflows, or transaction helpers.

## Migration Flow

1. add a migration in `src/server/db/migrations/`
2. update `src/server/db/schema/*`
3. update `src/server/db/schema/index.ts`
4. wire `src/server/db/repositories/index.ts` if a new repo is needed
5. update `docs/db-schema.md`

Build and run migrations with:

```bash
pnpm build:migrate
pnpm migrate:db
```

## Handler Shape

1. validate input
2. load via `context.repos`
3. enforce auth or ownership
4. write changes
5. return serialized data
