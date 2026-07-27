# Technology stack and platform plan

## Goal

Keep the cohesive parts of the stack, reduce accidental surface area, and make runtime/native claims evidence-based.

## Stack decision matrix

| Area                                 | Recommendation                   | Reason                                                                                                                     |
| ------------------------------------ | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| React 19 + React Compiler            | Keep                             | Current conventions already avoid manual memoization and the build is working.                                             |
| TanStack Start/Router/Query          | Keep                             | It directly supports the desired typed router, SSR shell, and SPA data model.                                              |
| oRPC                                 | Keep                             | It is a good typed boundary for web and potential non-web clients.                                                         |
| Better Auth                          | Keep                             | It cleanly owns identity/session lifecycle; clarify its exception to the oRPC write rule.                                  |
| Kysely + PostgreSQL                  | Keep                             | SQL visibility and handwritten types fit the starter. Fix schema drift instead of switching ORMs.                          |
| Zod 4                                | Keep                             | Use shared input/output/env contracts; avoid duplicate client/server schemas where DTOs can be shared.                     |
| Base UI + shadcn source + Tailwind 4 | Keep, trim                       | The primitives are sound, but the checked-in component kitchen sink adds CSS/dependency maintenance.                       |
| Nitro 3 alpha                        | Contain and pin                  | It currently builds, but an alpha runtime should be isolated behind the web server adapter and upgraded as a tested group. |
| Node 24                              | Keep as sole production baseline | This matches `pg`, `AsyncLocalStorage`, Docker, and the checked-in server entry.                                           |
| Cloudflare Workers                   | Defer                            | It requires a different request context/DB adapter and should not be implied by an environment variable alone.             |
| Global state library                 | Do not add                       | TanStack Query plus local React state is sufficient.                                                                       |
| Turborepo/Nx                         | Do not add yet                   | Five small packages do not justify another task graph until measured CI/build latency does.                                |

## Version strategy

1. Add an exact `packageManager` field and retain a committed lockfile.
2. Put repeated core versions in pnpm catalogs.
3. Upgrade these as compatibility groups:
   - TanStack Start, Router, Router SSR Query, devtools
   - oRPC client/server/query/contract
   - React, React DOM, types, compiler plugin
4. Prefer exact versions for alpha/runtime tooling such as Nitro.
5. Run `pnpm check`, `pnpm build`, and a migration smoke after each grouped update.
6. Review `minimumReleaseAge` and `allowBuilds` under the pinned pnpm version; the current numeric `allowBuilds` keys appear malformed.

## Dependency cleanup candidates

Validate each removal with type checking and a production build, but the source audit suggests:

### `apps/web`

- Remove unused `uuidv7`.
- Remove `@better-upload/client` until a live upload UI exists, or add the promised reference UI.
- Remove direct `@tanstack/query-core` and `@tanstack/start-server-core` if no source import requires them.
- Remove direct `kysely` and `pg`; they belong to `@better-spa/db`.
- Remove direct `lodash-es`/types; only the RPC package imports it.
- Remove direct `date-fns`/`date-fns-tz` if all usage stays in `@better-spa/shared`.
- Move `@base-ui/react` from `devDependencies` to `dependencies` because application code imports it at runtime.

### `packages/rpc`

- Replace `pickBy` with a small typed object construction and remove `lodash-es`.
- Remove `@orpc/client`, `better-auth`, and `kysely` if the final source audit confirms there are no direct imports.

### `packages/shared`

- Remove the unused Better Auth dependency and broken RBAC export.
- Keep only cross-runtime dependencies used by exported helpers/schemas.

### `packages/db`

- Remove `kysely-codegen`; repository rules explicitly prohibit using it.
- Keep migration-only tooling in `devDependencies`.

Use a configured dead-code/dependency checker to prevent these from returning.

## UI and bundle surface

The current build reports roughly:

- main client chunk: 526 kB minified, 162 kB gzip
- stylesheet: 147 kB, 22 kB gzip
- admin users chunk: 72 kB minified
- theme-toggle-related chunk: 116 kB minified

Recommended actions:

1. Remove unused shadcn primitives from the minimal starter; Tailwind scans their classes even when routes do not import them.
2. Keep heavy chart/carousel/calendar/command dependencies only when a live screen demonstrates them.
3. Run a bundle visualizer before changing framework code; optimize measured package contributors, not chunk names alone.
4. Keep route-level code splitting and set a budget for initial JS/CSS in CI once a representative production page exists.
5. Use one theme system. The custom `ThemeProvider` and `next-themes` are both present, while the Sonner wrapper reads the latter. Prefer the custom provider consistently or adopt `next-themes`, not both.
6. Keep devtools development-only and verify stripping as part of build analysis.

## Contracts and native readiness

The current router types are enough for the web workspace but not a complete mobile story. Raw TS package exports, cookie auth, server-derived router types, and the absence of a tracked mobile app make the README claim too strong.

When a second client is real:

1. Add `packages/contracts` with oRPC contract definitions, Zod DTOs, and no Node imports.
2. Have `packages/rpc` implement those contracts.
3. Build declarations/JavaScript for contracts instead of assuming every consumer transpiles workspace TypeScript.
4. Define mobile auth transport explicitly—cookie handling, secure token storage, refresh/revocation, and base URL configuration.
5. Add a contract-consumer smoke build for the mobile package.
6. Keep web-only date formatting and UI helpers out of the contracts package.

Until these exist, describe the API as **native-capable**, not native-ready.

## Runtime and infrastructure choices

### Recommended now

- Node 24 container/runtime
- PostgreSQL 16+
- S3-compatible object storage
- ingress/load-balancer rate limits
- structured Node logs

### Add only when required

- **Pino** for structured JSON logging and redaction, replacing the current logger before adding telemetry.
- **Redis/Valkey** for distributed per-user rate limiting or caching only in multi-instance deployments with a measured need.
- **OpenTelemetry/Sentry** after request IDs and structured errors are stable.
- **Queue/worker runtime** only when user-visible work exceeds request lifetime; do not revive the job schema without a worker lifecycle.
- **Cloudflare adapter** only with a Worker entry, compatible PostgreSQL strategy, binding-based env, and CI deployment smoke.

## Quality tooling recommendation

- Keep Oxlint and Prettier as the fast baseline.
- Add a small workspace export validator.
- Add Knip for dependency/dead-code maintenance.
- When testing is explicitly approved, use Vitest plus real PostgreSQL integration tests and a minimal Playwright suite.
- Avoid ESLint duplication unless a required rule is unavailable in Oxlint.

## Explicit non-recommendations

- No ORM rewrite to Prisma/Drizzle.
- No GraphQL layer alongside oRPC.
- No Redux/Zustand for server state.
- No microservice split for auth, RPC, or jobs.
- No generic service/repository interfaces for every table.
- No simultaneous Node, Vercel, and Worker promise without separate verified adapters.
- No broad dependency update before restoring green checks and package metadata.

## Acceptance criteria

- Every direct dependency has a source import or documented tooling purpose.
- Core framework versions are upgraded in compatible groups.
- Runtime dependencies are not misclassified as dev-only.
- One theme implementation owns HTML class, persistence, and toaster theme.
- Initial bundle/CSS budgets are measured and substantially lower for the minimal starter, or the kitchen-sink tradeoff is documented.
- Native and Cloudflare claims correspond to checked-in clients/adapters and CI smoke builds.
