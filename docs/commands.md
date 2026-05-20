# Commands Reference

Run `pnpm check` at the end of every task.

`package.json` requires Node `>=24`.

## App

```bash
pnpm dev
pnpm build
pnpm preview
pnpm start
```

## Quality

```bash
pnpm format         # prettier --write
pnpm format:check   # prettier --check (read-only)
pnpm lint           # oxlint --fix
pnpm lint:check     # oxlint (read-only)
pnpm check-types
pnpm check          # format:check + lint:check + check-types (read-only)
```

`pnpm check` is read-only — safe in CI and pre-push. Use `pnpm format` / `pnpm lint` locally to apply fixes.

## Database

```bash
pnpm build:migrate
pnpm migrate:db
pnpm kysely
pnpm db:snapshot    # regenerates docs/db-schema.md from the live DB
```

- Migrations live in `src/server/db/migrations/`.
- The app uses handwritten schema types, not Kysely codegen.
- Use `snake_case` in raw SQL.

## Auth and UI

```bash
pnpm auth:secret
pnpm auth:generate
pnpm ui add <component>
```

## Maintenance

```bash
pnpm deps
pnpm deps:major
```

## Current Reality

- There is no `pnpm worker` script in `package.json`.
- Do not document or rely on worker commands unless you add them.
