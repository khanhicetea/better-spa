# Commands Reference

The repository requires Node 24 and pnpm 11.17.0. End every task with `pnpm check`.

## Development and production

```bash
pnpm setup
pnpm dev               # web app
pnpm dev:mobile        # Expo development server
pnpm mobile:ios
pnpm mobile:android
pnpm build             # alias of build:node
pnpm build:node
pnpm build:worker
pnpm preview
pnpm start
```

`setup` is safe for an existing `.env`: it only creates the file when absent and only
fills a missing auth secret. Mobile API URL setup is documented in
`apps/mobile/README.md`.

## Quality

```bash
pnpm format
pnpm lint
pnpm format:check
pnpm lint:check
pnpm validate:workspace
pnpm check-types
pnpm check
pnpm check:build
pnpm check:full
pnpm knip
```

`check` is read-only: formatting, zero-warning Oxlint, workspace metadata/import
validation, and package-local `tsc --noEmit`. `check:build` adds both production builds.
`check:full` adds Knip, Worker type drift, and Wrangler dry-run.

## Database

```bash
pnpm db:up
pnpm db:down
pnpm db:generate --name=<change>
pnpm db:migrate
pnpm db:check
pnpm db:snapshot
```

Drizzle table definitions live in `packages/db/src/schema/`; `db:generate` writes reviewed
SQL migrations under `packages/db/drizzle/`. `db:migrate` uses direct `DATABASE_URL`, and
`db:snapshot` regenerates `docs/db-schema.md` from the live database.

## Auth and UI

```bash
pnpm auth:secret
pnpm auth:generate
pnpm ui add <component>
```

Auth commands use the pinned CLI and `packages/auth/auth.config.ts`. Review generated auth
schema changes before keeping them. The UI command may add transitive primitives; retain
only components used by live screens.

## Workers

```bash
pnpm worker:types
pnpm worker:types:check
pnpm worker:preview
pnpm worker:dry-run
pnpm worker:deploy
```

`worker:types` updates the committed binding/runtime declarations.
