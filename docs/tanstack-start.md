# TanStack Start Routing Guide

Routing reference for this repo.

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
      -settings/*
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

- Parentheses do not affect the URL.
- `(auth)` groups public auth pages.
- `(user)` groups authenticated pages.

Easy mapping:

- `src/routes/(auth)/login.tsx` -> `/login`
- `src/routes/(user)/app/todo.tsx` -> `/app/todo`

## Layout Rules

- `src/routes/__root.tsx` owns app-wide providers and the HTML shell.
- Use `route.tsx` for layout, guards, and shared preloading.
- Keep page files focused on feature UI.

## SPA Opt-In

- Put `ssr: "data-only"` on the layout that should behave as an SPA branch.
- Preload shell and auth data at that same boundary.
- Current SPA branches:
  - `src/routes/(user)/app/route.tsx` -> `/app/*`
  - `src/routes/admin/route.tsx` -> `/admin/*`

## Protected Layouts

- `src/routes/(user)/route.tsx` enforces login
- `src/routes/admin/route.tsx` enforces login and admin role

Both return the resolved user so child routes get non-null typing.

## Data Loading Pattern

1. validate search params in the route
2. derive `loaderDeps` when search params affect the fetch
3. prefetch with `context.queryClient.prefetchQuery(...)`
4. read the same query in the component with `useSuspenseQuery(...)`

## API Routes

Current API routes:

- `src/routes/api/auth.$.ts`
- `src/routes/api/rpc.$.ts`
- `src/routes/api/upload.$.ts`

Do not add server endpoints outside the route tree unless the runtime requires it.
