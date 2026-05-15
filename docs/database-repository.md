# Database and Repository Pattern

Compact reference for DB work in this repo.

## Non-Negotiables

- No Kysely codegen.
- Schema types are handwritten in `src/server/db/schema/`.
- Prefer repositories from `context.repos`.
- Use raw `db` only when the repository abstraction is clearly the wrong fit.

## DB Module Structure

```
src/server/db/
├── client.ts          # DB client factory (getDatabase, getDatabasePooling) + QueryLoggingPlugin
├── migrate.ts         # Migration runner script (used by build:migrate)
├── index.ts           # Barrel re-export of client + repository factory
├── schema/
│   ├── auth.ts        # User, Session, Account, Verification table types
│   ├── todo.ts        # TodoItem table types
│   ├── job.ts         # Job table types + enums
│   └── index.ts       # Database interface (combines all tables)
├── repositories/
│   ├── types.ts       # Shared TS types: TableRow, IdOf, query conditions, BaseRepository interface
│   ├── repository.ts  # Repository<TTable> class implementation
│   └── index.ts       # createRepos() factory + Repositories type
└── migrations/        # Kysely migration files
```

### Key imports

```ts
// DB client and type
import { getDatabase } from "@/server/db/client";
import type { DB } from "@/server/db/client";

// Repository factory and type
import { createRepos } from "@/server/db/repositories";
import type { Repositories } from "@/server/db/repositories";

// Or use the barrel:
import { getDatabase, createRepos } from "@/server/db";
import type { DB, Repositories } from "@/server/db";
```

## Live Schema Files

- `src/server/db/schema/auth.ts`
- `src/server/db/schema/todo.ts`
- `src/server/db/schema/job.ts`
- `src/server/db/schema/index.ts`

Each schema file exports:

- `<Name>Table`
- `<Name>`
- `<Name>Insert`
- `<Name>Update`

## Naming

- Database tables are singular in SQL: `user`, `session`, `todo_item`, `job`
- TypeScript table keys are camelCase: `user`, `todoItem`, `job`
- Use `snake_case` in raw SQL and `camelCase` in Kysely code

## Repository Files

- Types / interface: `src/server/db/repositories/types.ts`
- Base implementation: `src/server/db/repositories/repository.ts`
- Factory: `src/server/db/repositories/index.ts`

Current live repos:

- `repos.user`
- `repos.todoItem`

## Base Methods

Use the built-in methods before adding custom repository code:

- `find({ where, modify })`
- `findSelect({ select, where, modify })`
- `findById(id)`
- `findByIdOrFail(id)`
- `findOne({ where, modify })`
- `findPaginated({ page, pageSize, where, modify })`
- `count(where)`
- `exists(id)`
- `existsBy(where)`
- `insertReturn(data)`
- `insertMany(data)`
- `updateById({ id, data })`
- `updateMany({ where, data })`
- `deleteById(id)`
- `deleteMany(where)`
- `upsert({ data, conflictColumns, updateData })`

## Query Patterns

Simple equality:

```ts
await repos.todoItem.find({
  where: { userId: context.user.id },
});
```

Complex query builder:

```ts
await repos.user.find({
  modify: (qb) => qb.orderBy("createdAt", "desc").limit(20),
});
```

## When to Add a Custom Repository Class

Add one only when the logic is actually reusable or complex.

- Good: search logic, multi-step transaction helpers, reusable cross-table workflow
- Bad: `findByUserId(userId) { return this.find({ where: { userId } }) }`

If you add a new repository:

1. Create `src/server/db/repositories/<name>.repo.ts`
2. Register it in `src/server/db/repositories/index.ts`
3. Add its table type to `src/server/db/schema/index.ts`

## Migration Workflow

1. Create the migration in `src/server/db/migrations/`
2. Add or update schema types in `src/server/db/schema/`
3. Wire repository access if needed
4. Update `docs/db-schema.md`

## Practical Rule

Most handlers in this repo should stay simple:

- validate input
- load via `context.repos`
- enforce auth/ownership
- write changes
- return serialized data
