# KitKit Architecture

The application server-renders the HTML shell and one canonical bootstrap payload. Feature
screens then behave as an SPA with TanStack Router and Query.

## Canonical bootstrap

`packages/rpc/src/handlers/app.ts` exposes `app.bootstrap`. Its explicit DTO contains:

- `app`: name, package version, environment, runtime
- `user`: a safe self-user summary or `null`
- `preferences`: theme and timezone
- `capabilities`: configured OAuth providers and private-upload availability

`apps/web/src/routes/__root.tsx` ensures
`bootstrapQueryOptions()` during root loading. Guards, shell navigation, theme
initialization, OAuth buttons, and capability-driven UI read that same query cache. Do not
create a second auth or shell query.

Invalidate bootstrap after sign-in, sign-up, sign-out, profile updates, account deletion,
or impersonation. The helper lives in `apps/web/src/lib/queries.ts`.

## Shell and routes

- `apps/web/src/routes/__root.tsx` owns HTML, providers, errors, devtools, and toaster.
- `apps/web/src/components/shell/` owns navigation, theme, and shared shell/error UI.
- `/app/*` opts into `ssr: "data-only"` at
  `apps/web/src/routes/(user)/app/route.tsx`.
- `/admin/*` opts in at `apps/web/src/routes/admin/route.tsx`.
- Public auth pages live under `apps/web/src/routes/(auth)/`.
- The user boundary redirects anonymous users to `/login`.
- The admin boundary redirects non-admin users to `/app`.

Auth protection and SPA behavior are independent route concerns. Use `route.tsx` for
layouts and guards; keep pages focused on data and composition.

## Data loading

Loaders must await server data needed by a suspense-rendered screen. Use the same oRPC query
options in the loader and `useSuspenseQuery`. Route-owned query modules own invalidation,
such as:

- `apps/web/src/routes/(user)/app/-todo/queries.ts`
- `apps/web/src/routes/admin/-users/queries.ts`

Do not thread `refetch` callbacks down component trees and do not use optimistic writes.

## Request context

`packages/rpc/src/context.ts` creates the shared request context used by both adapters:

- request ID, headers, response headers, and client address
- Better Auth session
- database and repositories
- storage signer and rate-limit service
- runtime/environment/application metadata
- `waitUntil`

Node initializes process-level resources in `apps/web/src/server/node-server.ts`. Workers
initialize request-scoped DB/auth/repository resources in
`apps/web/src/server/cloudflare-worker.ts`.

Better Auth runs through its minimal initializer and the Drizzle adapter. Kysely remains an
upstream Better Auth dependency but is not used directly by application code.

`context.waitUntil` is only for lightweight post-response work. The project has no job
table, durable queue, or dedicated background-worker runtime.
