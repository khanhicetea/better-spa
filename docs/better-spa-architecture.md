# Better SPA Architecture

How the shell-SPA model works here.

## Core Model

- `src/routes/__root.tsx` owns the HTML shell, global providers, error boundary, devtools, and toaster.
- Route groups decide auth and SPA behavior; page files stay focused on data and UI.
- TanStack Query owns server state. oRPC owns server calls.
- Server-side oRPC calls use `src/lib/orpc.server.ts`; browser calls use `/api/rpc`.

## SPA Branches

Current `ssr: "data-only"` branches:

- `/app/*`: `src/routes/(user)/app/route.tsx`
- `/admin/*`: `src/routes/admin/route.tsx`

For a new SPA branch:

1. put `ssr: "data-only"` on the layout boundary
2. call `preloadBetterSpa(context.queryClient)` in `beforeLoad`
3. prefetch child page data with the same query options used by the component

`preloadBetterSpa()` loads shell data and best-effort auth data from `src/lib/router/better-spa.ts`.

## Auth Boundaries

- Public auth pages live under `src/routes/(auth)`.
- `src/routes/(auth)/route.tsx` redirects signed-in users to `/app/todo`.
- `src/routes/(user)/route.tsx` requires a user and redirects anonymous users to `/login`.
- `src/routes/admin/route.tsx` requires admin role and redirects non-admin users to `/app`.

Auth protection and SPA opt-in are separate. A protected route does not need to be an SPA branch.

## Route Rules

- Use `route.tsx` for layout, guards, and shared preloading.
- Use page files for search params, loaders, queries, and composition.
- Put route-adjacent support code in a sibling `-folder` when a page grows.

Live references:

- User feature: `src/routes/(user)/app/todo.tsx`
- Settings feature: `src/routes/(user)/settings/index.tsx`
- Admin feature: `src/routes/admin/users.tsx`
- Auth UI: `src/routes/(auth)/-auth/*`

## Background Work

- `context.waitUntil` is available for lightweight post-response work only.
- There is no live worker runtime or active `job` table in the current schema.
- Add a real queue/table/runtime before documenting user-visible async jobs.
