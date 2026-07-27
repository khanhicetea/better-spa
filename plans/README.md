# Better SPA improvement roadmap

Audit date: 2026-07-26

This directory records recommendations only. The repository has a strong core stack and does not need a rewrite; it needs a short truth-and-safety pass, followed by clearer runtime and package boundaries.

## Executive recommendation

Keep React, TanStack Start/Router/Query, oRPC, Better Auth, Kysely, PostgreSQL, Zod, Base UI, and Tailwind. Focus effort on:

1. making the monorepo and documentation agree
2. restoring a green, deterministic quality gate
3. securing and clarifying all write paths
4. making the advertised shell-SPA flow real, or removing its unused bootstrap request
5. separating browser-safe contracts from Node-only implementation details if native support is a real goal
6. reducing dependency, UI-component, and deployment surface area

Do not introduce microservices, a second ORM, a global client-state library, Turborepo, or a second production runtime yet.

## What is already good

- The main technology choices fit together and preserve end-to-end TypeScript types.
- `apps/web`, `packages/auth`, `packages/db`, `packages/rpc`, and `packages/shared` are a useful first monorepo split.
- TanStack Start import protection explicitly blocks server modules and `pg`/`kysely` from client builds.
- Auth guards are placed at route boundaries, while ownership checks are also present in todo handlers.
- Environment variables are validated, migrations are explicit, and the Docker image is multi-stage.
- Route-adjacent `-todo`, `-users`, and `-settings` folders are a good local-colocation pattern.
- Type checking and the production build currently pass.

## Audit evidence

| Area               | Observation                                                                                                                                                           | Consequence                                                                                                        |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Quality gate       | `pnpm check` fails in Prettier before lint/type checking. It sees an untracked `apps/mobile/ios/build` artifact and three tracked files that are not formatted.       | The documented final gate is not currently trustworthy.                                                            |
| Lint               | Standalone Oxlint reports three warnings, including `Number(result?.count) ?? 0`, which can return `NaN`.                                                             | A real repository bug is hidden by warning-only policy.                                                            |
| Build              | `pnpm build` succeeds, but the main client chunk is about 526 kB minified/162 kB gzip and the stylesheet is about 147 kB/22 kB gzip.                                  | The starter ships more UI/dependency surface than its live screens need.                                           |
| Documentation      | Most docs and `AGENTS.md` still point to a pre-monorepo `src/server/...` layout. `README.md` documents a root bootstrap that does not exist.                          | Humans and agents are directed to nonexistent or incorrect files.                                                  |
| Package metadata   | `@better-spa/rpc/auth/server` and `@better-spa/shared/auth/rbac` export missing files. `auth:generate` points to a missing RPC auth file.                             | Type checking does not validate the complete public package surface.                                               |
| Commands           | README/AGENTS advertise root `auth:*` and `ui` commands that are only defined in `apps/web`, and one is broken there.                                                 | Onboarding commands fail or are ambiguous.                                                                         |
| Database model     | The latest migration drops `job`, but `Database` still includes it through `packages/db/src/schema/job.ts`.                                                           | Kysely claims a table exists when production SQL says it does not.                                                 |
| Security boundary  | `apps/web/src/routes/api/upload.$.ts` has no visible auth/ownership check and can issue private read URLs during upload.                                              | Anonymous or unscoped object-storage use is possible unless the upload library adds guarantees not expressed here. |
| RPC errors         | The base procedure declares `RATE_LIMITED`, while middleware throws `TOO_MANY_REQUESTS` with a different data shape.                                                  | The typed error contract and runtime behavior diverge.                                                             |
| Shell architecture | `app.shellData` is prefetched in app/admin branches, but `useShellData` has no caller. The root route has no bootstrap loader.                                        | Every SPA entry can make an unused request while the central architectural claim remains false.                    |
| Runtime claims     | The checked-in server entry is Node/`AsyncLocalStorage` specific; Cloudflare support is only a document.                                                              | `NITRO_PRESET=cloudflare-module` alone cannot make this app Worker-compatible.                                     |
| Dead/drifted code  | There are duplicate `use-mobile` hooks, a placeholder Nitro task, stale job schema, unused RPC actions, and todo export progress props permanently set to false/zero. | The starter teaches patterns that are no longer live.                                                              |

## Recommended delivery order

| Priority | Outcome                                                                                                                | Plan                                                                                                                       |
| -------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| P0       | Green checks, truthful docs/manifests/schema, authenticated upload boundary                                            | [Foundation and structure](./01-foundation-and-structure.md), [Application architecture](./03-application-architecture.md) |
| P1       | One canonical bootstrap/auth flow, consistent route data loading, typed errors/DTOs                                    | [Application architecture](./03-application-architecture.md)                                                               |
| P1       | Reproducible setup, root commands, CI, workspace validation                                                            | [DX and quality gates](./02-dx-and-quality-gates.md)                                                                       |
| P2       | Lean dependencies/UI surface, aligned versions, explicit Node runtime                                                  | [Stack and platform](./04-stack-and-platform.md)                                                                           |
| P3       | Native-ready contract package, distributed rate limiting, deeper observability/testing when product needs justify them | [Stack and platform](./04-stack-and-platform.md)                                                                           |

## Decisions to make before implementation

1. **Product identity:** Is this a Node-first web starter, or a multi-runtime/native starter? Recommend Node-first today; make native readiness a separately tested capability.
2. **Shell contract:** Either implement one meaningful root bootstrap or delete the unused shell RPC. Do not retain the current middle state.
3. **Auth write exception:** Document that Better Auth owns sign-in/sign-up/session/account lifecycle; oRPC owns application/domain writes. Decide whether admin identity operations need oRPC wrappers for auditability.
4. **Upload policy:** Decide whether uploads are user-private, tenant-private, or public. Encode that scope in object keys and authorization rather than route names alone.
5. **UI starter scope:** Decide between a minimal starter and a component kitchen sink. Recommend minimal, with `pnpm ui add` as the expansion path.

## Overall completion criteria

- A clean clone can install, configure, migrate, run, check, and build using documented root commands.
- `pnpm check` is green and remains read-only.
- Every package export resolves, every documented path exists, and the database TypeScript schema matches migrations.
- Every write has an explicit authentication, authorization, validation, and error boundary.
- The bootstrap request is consumed by the shell, or it no longer exists.
- Node is the only promised production runtime until another adapter has its own build and smoke check.
- No new abstraction is added without at least two callers or a concrete runtime boundary.
