# Foundation and structure plan

## Goal

Make the repository small, truthful, navigable, and internally consistent before adding architectural abstractions.

## Current structural problems

### 1. The monorepo split is newer than its documentation

`AGENTS.md`, `README.md`, and most of `docs/` still reference `src/server/db`, `src/server/rpc`, and root `src/routes`. Live code now resides in `apps/web/src` and `packages/*`. Some docs also disagree about whether the `job` table exists and whether the root route loads shell data.

This is the highest-DX issue because the documentation is explicitly intended to guide agents.

### 2. Package surfaces are not validated

- `packages/rpc/package.json` exports a missing `./src/auth/server.ts`.
- `packages/shared/package.json` exports a missing `./src/auth/rbac.ts`.
- `apps/web` has an `auth:generate` script pointing at the same missing RPC auth path.
- `packages/rpc/src/types.d.ts` is authored like source code but named as a declaration output.
- Workspace packages export raw TypeScript. This is acceptable for the current Vite app, but it is not automatically portable to Expo or external consumers.

### 3. Database source and migrations disagree

`2026-05-12-01-00_remove-job.ts` drops `job`, while `packages/db/src/schema/index.ts` still registers `JobTable`. Handwritten schema types must represent the live database, not migration history.

### 4. Stale and duplicate examples obscure the baseline

- `apps/web/src/hooks/use-mobile.ts` and `apps/web/src/lib/hooks/use-mobile.ts` are identical.
- `apps/web/src/nitro/tasks/hello.js` is a placeholder but enables experimental task scanning in production builds.
- Todo export still carries progress UI from the removed job concept, although progress is always disabled.
- `user.get` and `useShellData` currently have no application callers.
- `apps/mobile` contains only local generated/build artifacts and is not a workspace package.

### 5. Component categories are vague

`components/common` and `components/spa` mix shell, navigation, auth, error, theme, and progress concerns. The route-adjacent feature folders are clearer and should remain the default.

## Target structure

Use the existing monorepo, with narrower meanings:

```text
apps/
  web/
    src/
      components/
        ui/             # upstream-style primitives only
        shell/          # app shell, navigation, progress, theme
        data-table/     # genuinely reusable web composition
      env/
      lib/              # web adapters and query factories
      routes/           # thin routes + sibling -feature folders
      server/           # Node entry and web-specific HTTP/storage adapters
packages/
  auth/                 # Better Auth client/server/RBAC subpaths
  db/                   # PostgreSQL client, exact schema, migrations, repositories
  rpc/                  # oRPC procedures and server request contract
  shared/               # browser-safe, framework-neutral helpers/schemas only
  contracts/            # optional; add only when a second client actually exists
```

If structured logging is shared by DB, RPC, and the web runtime, a small server-only `packages/observability` package is reasonable. Do not put `process.env`-dependent code into a package advertised as browser-safe.

## Work plan

### Phase S0 — Restore repository truth

1. Update every documented path to `apps/web/src/...` or `packages/...`.
2. Rewrite the README tree for the actual workspace.
3. Correct architectural statements:
   - root currently owns providers/HTML, not shell data loading
   - `job` is removed
   - production is Node-only
   - native readiness is aspirational until a native client exists
4. Fix or remove invalid package exports.
5. Replace the broken `auth:generate` target with a valid CLI config owned by `packages/auth`, then expose it through a root script. If Better Auth's CLI cannot load the current `getAuthConfig(options)` factory directly, add a small CLI-only config entry instead of moving auth ownership back into RPC.
6. Remove `JobTable` from the live `Database` interface and delete the legacy schema file after confirming no migration imports it.
7. Regenerate `docs/db-schema.md` from a freshly migrated database rather than hand-editing it.
8. Add repository-owned ignores for `.expo`, `ios/build`, and other mobile artifacts; do not depend on a developer's global gitignore.

### Phase S1 — Make boundaries explicit

1. Rename `packages/rpc/src/types.d.ts` to `types.ts`, or generate declarations as build output.
2. Keep `packages/shared` browser-safe:
   - remove its unused Better Auth dependency/export
   - keep pure date, pagination, and serialized S3 schemas
   - move or clearly mark the Node-only logger
3. Audit every package for direct dependencies only. A package should not rely on hoisted/transitive modules or declare modules it never imports.
4. Add an automated workspace check that verifies:
   - all `exports` targets exist
   - all root proxy scripts resolve
   - package names are unique
   - no forbidden server package is imported from browser code
5. If native work starts, introduce `packages/contracts` using oRPC contracts/DTO schemas. Until then, avoid an empty architecture package.

### Phase S2 — Remove drift and improve navigation

1. Keep one canonical `useIsMobile` under the shadcn-configured `@/hooks` path.
2. Remove the placeholder Nitro task and task config unless scheduled tasks are a supported feature.
3. Simplify todo export to its real synchronous behavior, or remove it. Delete dead progress props.
4. Remove unused RPC actions/hooks, or add a live reference that proves why they belong in the starter.
5. Consolidate `components/common` and `components/spa` into clear `components/shell` names; avoid a broad `components/shared` bucket.
6. Preserve route-adjacent `-todo`, `-users`, and `-settings` folders. Promote a component only after a second feature uses it.
7. Remove unused `components/ui/*` files in a minimal-starter edition. They can be restored with `pnpm ui add`.

### Phase S3 — Clarify TypeScript ownership

1. Remove the root `@/* -> ./src/*` path alias because root `src` does not exist.
2. Either:
   - keep package-local `tsc --noEmit` checks and make the root config minimal, or
   - adopt TypeScript project references and declaration outputs for reusable packages.
3. Prefer project references only if incremental build speed or external package consumption justifies the added configuration.

## Guardrails

- Do not replace route colocation with a large global `features` directory.
- Do not create one package per helper.
- Do not squash deployed migrations. If this is still an unpublished template, a one-time baseline migration reset is a separate, explicit decision.
- Do not hand-edit generated route trees or database snapshots.

## Acceptance criteria

- `rg 'src/server/(db|rpc)' README.md AGENTS.md docs` returns no stale live-path references.
- Every workspace `exports` target exists.
- `Database` contains only tables present after `migrateToLatest`.
- There is one mobile hook, one theme owner, and no placeholder background task.
- A new contributor can infer whether code is browser-safe, server-only, or shared from its package/path.
