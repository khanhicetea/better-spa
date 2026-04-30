# Shell SPA Architecture

Compact reference for how this app is structured today.

## Core Model

- Keep the document shell SSR for every route.
- Opt individual route prefixes or pathless groups into `shell + SPA`.
- Leave non-opted routes as regular SSR pages inside the same shell.
- Use TanStack Query for cached shell and page data.
- Use oRPC for all server calls.

## Request Flow

1. `src/routes/__root.tsx` renders the shared HTML shell and global providers.
2. Routes that opt into `shell + SPA` preload shell data and auth cache at their own layout boundary.
3. Those same opt-in layouts set `ssr: "data-only"` so the branch hydrates as an SPA after the shell render.
4. Non-opted routes stay on normal SSR and only fetch what they need.
5. Child routes still prefetch their own data in loaders and consume it with TanStack Query.

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

## SPA Boundaries

- `/app/*` opts in at `src/routes/(user)/app/route.tsx`
- `/admin/*` opts in at `src/routes/admin/route.tsx`
- Reuse `preloadShellSpa()` from `src/lib/router/shell-spa.ts` if another prefix or route group should behave the same way later

## Auth Boundaries

- User-protected layout: `src/routes/(user)/route.tsx`
- Admin-protected layout: `src/routes/admin/route.tsx`
- Unauthenticated users redirect to `/login`
- Non-admin users redirect from `/admin/*` to `/app`
- Auth protection is separate from SPA opt-in, so protected SSR pages can coexist with protected SPA branches

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
