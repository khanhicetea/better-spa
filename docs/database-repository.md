# Database and Repository Pattern

## Rules

- Drizzle table definitions in `packages/db/src/schema/` are the schema source of truth.
- Prefer `context.repos` in RPC handlers; use raw `context.db` only when clearer.
- Keep repository APIs focused rather than exposing generic CRUD operations.
- Reuse the protected `BaseRepository` query helpers inside concrete repositories.
- Never use `drizzle-kit push`; generate and review SQL migrations.
- After every migration, regenerate `docs/db-schema.md` with `pnpm db:snapshot`.

## Live structure

```text
packages/db/
  drizzle.config.ts
  drizzle/<timestamp>_<name>/migration.sql
  src/client.ts
  src/schema/{auth,todo,index}.ts
  src/repositories/{index,todo,user}.ts
  src/snapshot.ts
```

`createRepos()` exposes `repos.user` and `repos.todoItem`. Both repositories extend the
protected-helper-only `BaseRepository`; their public APIs remain domain-specific. Todo
update/delete predicates include both row ID and owner ID.

## Schema conventions

- SQL tables are singular and columns use `snake_case`.
- TypeScript properties use `camelCase` through table-level casing.
- Select and insert types are inferred from Drizzle table objects.
- Mutation methods accept narrow update types, passed explicitly to `BaseRepository`.
- Base update/delete helpers require scoped predicates and are never public.
- Database timestamps are timezone-aware `Date` values; RPC DTOs use ISO strings.
- Better Auth uses its Drizzle 1.7 schema, including issuer-scoped provider account IDs.
- Persist uploaded objects according to `docs/file-storage.md`: each logical file is one
  complete typed JSON object, whether stored singly, in an array, or nested in JSONB; spreading
  its properties across columns is an anti-pattern.

## Resources

Node owns one process-level `pg.Pool` and Drizzle instance and closes it during graceful
shutdown. Workers create one request-scoped `pg.Client` through Hyperdrive and close it in
`finally`. Drizzle SQL logging is disabled.

## Migration flow

```bash
pnpm db:generate --name=<change>
# review migration.sql and snapshot.json
pnpm db:migrate
pnpm db:snapshot
pnpm check
```

`db:migrate` is a deployment-time Node command using direct `DATABASE_URL`. Migration
metadata lives in `drizzle.__drizzle_migrations`; migrations never run in Workers.
