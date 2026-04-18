# Shell SPA Architecture

**For Agents**: Read this doc when you need to understand the overall project architecture.

---

## Key Concepts

### Shell SPA Pattern

- **SSR (Server-Side Rendered)**: auth/session lookup, app settings, minimal shell layout
- **SPA (Single Page Application)**: route transitions, data loading, mutations, and feature UI

### Core Technologies

- **TanStack Start**
- **TanStack Router**
- **TanStack Query**
- **oRPC** (not tRPC)
- **Better Auth**
- **Kysely + PostgreSQL**
- **Job worker** (`pnpm worker`) for queued background tasks

---

## Default Route Surface

Production baseline keeps this route set:

- `/`
- `/login`
- `/signup`
- `/app` (redirects to `/app/todo`)
- `/app/todo`
- `/settings`
- `/admin`
- `/admin/users`
- `/admin/jobs`
- `/api/*`

`/app/hello-form` is intentionally removed.
Upload infra (`/api/upload/$`) remains available, but no default upload demo page is included.

---

## Shell Implementation

Shell logic is in `src/routes/__root.tsx`:

- server ensures shell data with `shellQueryOptions()`
- user auth query is prefetched non-blocking
- client hydration continues with cached query state

Relevant files:

- `src/routes/__root.tsx`
- `src/rpc/handlers/app.ts`
- `src/lib/queries.ts`

---

## Auth Boundaries

- User-protected routes: `src/routes/(user)/route.tsx`
- Admin-protected routes: `src/routes/admin/route.tsx`
- Unauthenticated users are redirected to `/login`
- Non-admin users are redirected from `/admin/*` to `/app`

Auth pages use shared route-adjacent modules:

- `src/routes/(auth)/-auth/auth-shell.tsx`
- `src/routes/(auth)/-auth/social-buttons.tsx`

---

## Feature Layout Pattern

Large routes are split into route-adjacent support modules (prefixed `-`):

- `src/routes/(user)/app/-todo/*`
- `src/routes/admin/-users/*`
- `src/routes/admin/-jobs/*`
- `src/routes/(auth)/-auth/*`

Route files stay focused on:

- search params validation
- loaders/prefetching
- top-level query/mutation orchestration
- page composition

---

## RPC Surface

Current production-baseline RPC names:

- `orpc.todo.list/create/update/delete/export`
- `orpc.user.list/get`
- `orpc.job.listAdmin/list/get/cancel` (`create` remains available)

Todo is the single reference feature that exercises auth, RPC, repositories, and job queue end-to-end.

---

## Job Queue Execution Rule

Long-running work must be **queue-only**:

- RPC handlers enqueue jobs and return job records
- web request context does **not** execute worker jobs directly
- only worker runtime (`src/server/worker/runner.ts`, `src/server/worker/worker.ts`) processes queued jobs
