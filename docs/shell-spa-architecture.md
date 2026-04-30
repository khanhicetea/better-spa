# Shell SPA Architecture

Compact reference for how this app is structured today.

## Core Model

- SSR only the shell: app metadata, auth bootstrap, top-level layout.
- Run the feature UI as an SPA after hydration.
- Use TanStack Query for cached shell and page data.
- Use oRPC for all server calls.

## Request Flow

1. `src/routes/__root.tsx` runs on the server first.
2. It `ensureQueryData(shellQueryOptions())` for shell data.
3. It `prefetchQuery(authQueryOptions())` without blocking render.
4. Child routes prefetch their own data in loaders.
5. Components consume the same query options with `useSuspenseQuery`.

## Current Route Surface

- `/`
- `/login`
- `/signup`
- `/app`
- `/app/todo`
- `/settings`
- `/admin`
- `/admin/users`
- `/api/auth/$`
- `/api/rpc/$`
- `/api/upload/$`

## Auth Boundaries

- User-protected layout: `src/routes/(user)/route.tsx`
- Admin-protected layout: `src/routes/admin/route.tsx`
- Unauthenticated users redirect to `/login`
- Non-admin users redirect from `/admin/*` to `/app`
- Both protected layouts use `ssr: "data-only"`

## Current Feature Baseline

- User CRUD example: `src/routes/(user)/app/todo.tsx`
- Admin list example: `src/routes/admin/users.tsx`
- Shared auth shell pieces: `src/routes/(auth)/-auth/*`

## Route-Adjacent Modules

Use a sibling folder prefixed with `-` when a route becomes large.

- Good: `src/routes/admin/-users/*`
- Good: `src/routes/(user)/app/-todo/*`
- Keep the main route file focused on search params, loaders, queries, and composition.

## RPC Boundary

- Client code calls `orpc.*` from `src/lib/orpc.ts`.
- Server-side RPC calls use the router directly through `createIsomorphicFn`.
- Client-side RPC calls go to `/api/rpc`.
- Only pass serializable input across the RPC boundary.

## Background Work

- Lightweight post-response work can use `context.waitUntil`.
- User-visible or long-running work should use a queue model.
- The current repo has a `job` table but no dedicated worker runtime checked in, so do not document or assume `pnpm worker` unless you add it.
