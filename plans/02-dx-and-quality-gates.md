# Developer experience and quality-gates plan

## Goal

Make the happy path one-command, reproducible, fast, and enforced in CI without hiding write operations inside validation commands.

## Current baseline

Commands run during this audit:

- `pnpm check`: **fails** in `format:check`
- `pnpm lint:check`: passes with three warnings
- `pnpm check-types`: passes for all five workspace projects
- `pnpm build`: passes with a large-chunk warning

Prettier currently scans a locally generated `apps/mobile/ios/build` file because `.prettierignore` does not cover it. It also reports tracked formatting drift in the upload route, lockfile, and workspace file. This means the mandated end-of-task check is red before any feature work starts.

## Work plan

### Phase D0 — Make checks deterministic

1. Add all generated/build locations to both repository and Prettier ignores:
   - `apps/*/.output`
   - `apps/mobile/.expo`
   - `apps/mobile/ios/build`
   - generated native directories as appropriate
2. Format tracked source/config files once, then keep `pnpm check` read-only.
3. Promote actionable Oxlint warnings to failures after cleaning the baseline.
4. Add an explicit Oxlint configuration so rule and ignore behavior does not change implicitly across upgrades.
5. Keep generated `routeTree.gen.ts`, shadcn primitives, and generated DB docs excluded only where there is a clear owner.

### Phase D1 — Repair and normalize root commands

Pin the package manager in root `package.json`, for example with `packageManager: pnpm@10.24.0`, and keep Node 24 in `.nvmrc`/`engines`.

Expose all common actions at the root:

```text
pnpm dev                 # web app
pnpm db:up               # local Postgres
pnpm db:down
pnpm db:migrate          # build + run migrations, or one direct runner
pnpm db:snapshot
pnpm auth:secret
pnpm auth:generate
pnpm ui add <component>
pnpm check
pnpm build
```

Keep compatibility aliases for existing `build:migrate`/`migrate:db` names for one transition if external automation may use them.

Add a small `pnpm setup` or documented sequence that:

1. verifies Node/pnpm versions
2. copies `.env.example` only when `.env` is absent
3. reports missing required values without printing secrets
4. starts or verifies Postgres
5. applies migrations
6. prints the local URL and next command

Do not make `pnpm dev` silently mutate the database.

### Phase D2 — Strengthen environment DX

1. Validate OAuth credentials as pairs. A client ID without a secret should fail with a precise message.
2. Validate S3 configuration as an all-or-none feature group and use URL schemas for endpoint/public URL fields.
3. Derive social-button visibility from a public server capability response, or document that UI flags must match server credentials.
4. Add startup diagnostics containing safe facts only: runtime, app version, enabled integrations, and DB host—not secrets.
5. Document common failures: occupied port, unavailable Postgres, unapplied migration, bad OAuth callback, and missing S3 config.

### Phase D3 — Add workspace-level validation

Add a fast script such as `scripts/validate-workspace.mjs` to check package export targets and documented command proxies. This catches issues TypeScript currently misses.

Add `knip` as a separate maintenance check after configuring generated route files and shadcn primitives. Use it to detect:

- unused dependencies such as `uuidv7`
- dead exports such as unused RPC/query helpers
- duplicate or unreachable source

Do not put a noisy, unbaselined dead-code scan into `pnpm check` immediately. First make it green, then decide whether it belongs in CI or a scheduled maintenance job.

### Phase D4 — CI

Add a minimal CI pipeline with pinned Node/pnpm and frozen installs:

1. `pnpm install --frozen-lockfile`
2. workspace/export validation
3. `pnpm check`
4. `pnpm build`
5. migration smoke against a disposable PostgreSQL 16 service
6. verify the generated DB snapshot has no diff, if snapshot generation is deterministic in CI

Cache the pnpm store, not `node_modules`. Upload build logs on failure. Keep deployment separate from validation.

### Phase D5 — Testing strategy when approved

There are currently no tests, and none should be added incidentally. When a testing task is explicitly approved, start with a small risk-based stack:

- Vitest for pure schemas/helpers and RPC error mapping
- PostgreSQL integration tests for repository ownership, uniqueness, and migrations
- Playwright for one login/protected-route flow and one admin authorization flow

Avoid broad snapshot testing and do not mock Kysely for behavior that PostgreSQL should prove.

## Dependency/version workflow

1. Use pnpm catalogs for versions repeated across packages: TypeScript, Zod, Better Auth, Kysely, and oRPC.
2. Update TanStack Start/Router/SSR integration as a tested group rather than independently.
3. Keep the lockfile committed and formatted by the pinned pnpm version.
4. Run dependency updates in CI branches with `check`, `build`, and migration smoke results attached.
5. Preserve `minimumReleaseAge`, but fix the malformed/ambiguous `allowBuilds` configuration for the pinned pnpm version.

## Fast versus complete checks

Recommended tiers:

```text
pnpm check          formatting + lint + types + workspace metadata
pnpm check:build    pnpm check + production build
pnpm check:full     check:build + approved tests + migration smoke
```

`pnpm check` should remain fast enough to run after every task and must not rewrite files.

## Acceptance criteria

- A clean checkout produces the same results on two machines with the documented Node/pnpm versions.
- Root README commands exist and call the intended package.
- `pnpm check` is green, read-only, and ignores generated native/build artifacts.
- CI blocks invalid exports, schema/migration drift, type errors, lint errors, formatting drift, and failed builds.
- Optional integrations fail with actionable configuration messages rather than late runtime exceptions.
