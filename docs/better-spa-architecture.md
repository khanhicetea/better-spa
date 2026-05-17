# Better SPA Architecture

How routing works in this repo today.

## Core Model

- `src/routes/__root.tsx` always renders the document shell and global providers.
- Only selected branches opt into SPA behavior.
- Use TanStack Query for cached shell/page data.
- Use oRPC for all server calls.

## SPA Branches

- `/app/*` opts in at `src/routes/(user)/app/route.tsx`
- `/admin/*` opts in at `src/routes/admin/route.tsx`
- New SPA branches should reuse `preloadBetterSpa()` from `src/lib/router/better-spa.ts`

SPA branches should:

1. set `ssr: "data-only"` at the layout boundary
2. preload shell/auth data at that same boundary
3. prefetch page data in child loaders with the same query options used in the component

## Auth Boundaries

- User auth guard: `src/routes/(user)/route.tsx`
- Admin auth guard: `src/routes/admin/route.tsx`
- Unauthenticated users redirect to `/login`
- Non-admin users redirect from `/admin/*` to `/app`

Auth protection and SPA opt-in are separate. Protected SSR pages can exist outside SPA branches.

## Route Rules

- Keep `route.tsx` for layout, guards, and shared preloading.
- Keep page files focused on search params, loaders, queries, and composition.
- Move route-adjacent support code into a sibling `-folder` when the route grows.

Live references:

- User page: `src/routes/(user)/app/todo.tsx`
- Admin page: `src/routes/admin/users.tsx`
- Shared auth UI: `src/routes/(auth)/-auth/*`

## RPC Boundary

- Client calls go through `src/lib/orpc.ts` to `/api/rpc/$`.
- Server-side route code can call the router directly.
- Only pass serialized values across the RPC boundary.

## Background Work

- Use `context.waitUntil` only for lightweight post-response work.
- Long-running or user-visible work should use a queue.
- The repo has a `job` table, but no dedicated worker runtime is checked in.
