# Commands Reference

Compact command list. Run `pnpm check` after edits.

## App

```bash
pnpm dev
pnpm build
pnpm preview
pnpm start
```

## Quality

```bash
pnpm format
pnpm lint
pnpm check-types
pnpm check
```

## Database

```bash
pnpm kysely migrate latest
pnpm kysely migrate up
pnpm kysely migrate down
pnpm kysely migrate list
pnpm kysely migrate make <name>
pnpm kysely sql "SELECT * FROM todo_item LIMIT 5" -f json
```

Use `snake_case` in raw SQL.

## Auth

```bash
pnpm auth:secret
pnpm auth:generate
```

## UI

```bash
pnpm ui add <component>
```

## Dependency Maintenance

```bash
pnpm deps
pnpm deps:major
```

## Current Reality

There is no `pnpm worker` script in the live `package.json`. Do not document or rely on one unless you add it.
