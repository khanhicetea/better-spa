# TanStack Start Routing Guide

Compact reference for route work.

## Live Route Shape

```text
src/routes/
  __root.tsx
  index.tsx
  (auth)/
    route.tsx
    login.tsx
    signup.tsx
    -auth/*
  (user)/
    route.tsx
    app/
      route.tsx
      index.tsx
      todo.tsx
    settings/
      route.tsx
      index.tsx
  admin/
    route.tsx
    index.tsx
    users.tsx
    -users/*
  api/
    auth.$.ts
    rpc.$.ts
    upload.$.ts
```

## Route Groups

- Folders in parentheses do not affect the URL.
- `(auth)` groups public auth pages.
- `(user)` groups authenticated pages.

Examples:

- `src/routes/(auth)/login.tsx` -> `/login`
- `src/routes/(user)/app/todo.tsx` -> `/app/todo`

## Root Route

`src/routes/__root.tsx` owns:

- top-level providers
- HTML shell

Keep it focused on app-wide concerns.

## Shell + SPA Opt-In

- Put `ssr: "data-only"` on the prefix or pathless layout that should behave like an SPA branch.
- Preload shell/auth cache at that same boundary instead of in `__root.tsx`.
- Current opted prefixes:
  - `src/routes/(user)/app/route.tsx` -> `/app/*`
  - `src/routes/admin/route.tsx` -> `/admin/*`
- Non-opted routes like `/` can stay full SSR in the shared shell.

## Protected Layouts

Use `beforeLoad` in layout routes:

- `src/routes/(user)/route.tsx` enforces login
- `src/routes/admin/route.tsx` enforces login + admin role

Both return the resolved user so child routes get non-null typing.

## Data Loading Pattern

1. Validate search params in the route.
2. Derive `loaderDeps` if query params affect the fetch.
3. Prefetch with `context.queryClient.prefetchQuery(...)`.
4. In the component, read the same query with `useSuspenseQuery(...)`.

## Layout Rule

Use `route.tsx` files for shared shells and guards. Keep page files focused on feature UI.

## API Routes

Current API routes:

- `src/routes/api/auth.$.ts`
- `src/routes/api/rpc.$.ts`
- `src/routes/api/upload.$.ts`

Do not add server endpoints outside the route tree unless there is a clear runtime reason.
