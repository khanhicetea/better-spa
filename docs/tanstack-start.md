# TanStack Start Routing Guide

## Live route shape

```text
apps/web/src/routes/
  __root.tsx
  index.tsx
  (auth)/
  (user)/
    app/
    settings/
  admin/
  api/
    auth.$.ts
    rpc.$.ts
    health/
      live.ts
      ready.ts
```

Parenthesized route groups do not affect URLs. For example,
`apps/web/src/routes/(user)/app/todo.tsx` maps to `/app/todo`.

## Layout and guards

- The root owns global providers and the canonical bootstrap loader.
- Use `route.tsx` for layouts, guards, and shared preload work.
- The `(auth)` boundary redirects an existing session away from auth pages.
- The `(user)` boundary requires `bootstrap.user`.
- The admin boundary additionally requires `bootstrap.user.role === "admin"`.
- `/app/*` and `/admin/*` use `ssr: "data-only"` for shell-SPA behavior.

Do not introduce a separate session query. Guards reuse
`bootstrapQueryOptions()` from `apps/web/src/lib/queries.ts`.

## Data loading

1. validate search parameters
2. derive `loaderDeps` when they affect the request
3. `await queryClient.ensureQueryData(...)` for data needed by suspense UI
4. use the identical options in `useSuspenseQuery(...)`
5. invalidate through the feature-owned query helper after writes

Use `prefetchQuery` only for best-effort data that is not required before rendering.

## API routes

- `/api/auth/$`: Better Auth HTTP lifecycle
- `/api/rpc/$`: oRPC
- `/api/health/live`: liveness
- `/api/health/ready`: database readiness

Private upload intents are RPC procedures; there is no upload HTTP router. Do not add
runtime endpoints outside the route tree unless a runtime adapter specifically requires it.

## Request observability

The Node build registers `evlog/nitro/v3` in `apps/web/vite.config.ts`, with Nitro async
context enabled. The root route installs `evlogErrorHandler` so structured evlog errors keep
their `why`, `fix`, and `link` fields in server responses. Nitro emits one wide event for web
requests; `/api/rpc` and its subpaths are excluded because the oRPC integration owns that
event.

The Cloudflare adapter uses `evlog/workers` for the equivalent web-request event and also
leaves `/api/rpc` and its subpaths to the oRPC integration. Both adapters propagate the generated
`x-request-id` into the framework request so events and responses share the same ID.
