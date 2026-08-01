# Web Conventions

Use the live user and admin features as implementation references:

- `apps/web/src/routes/(user)/app/todo.tsx`
- `apps/web/src/routes/admin/users.tsx`

## Routing and data loading

Parenthesized TanStack Router groups do not affect URLs. Put layouts, guards, and shared
preload work in `route.tsx`; keep page routes focused on feature data and composition.

- The root owns global providers and the canonical `app.bootstrap` loader.
- The `(auth)` boundary redirects signed-in users away from auth pages.
- The `(user)` boundary requires `bootstrap.user`.
- The admin boundary also requires `bootstrap.user.role === "admin"`.
- `/app/*` and `/admin/*` use `ssr: "data-only"` for shell-SPA behavior.

Do not add a separate session query. Guards reuse `bootstrapQueryOptions()` from
`apps/web/src/lib/queries.ts`.

For server data required by suspense UI:

1. Validate search parameters.
2. Derive `loaderDeps` when search values affect the request.
3. Await `queryClient.ensureQueryData(...)` in the loader.
4. Use the identical query options with `useSuspenseQuery(...)`.
5. Invalidate through a feature-owned query helper after writes.

Use `prefetchQuery` only for best-effort data. Do not pass `refetch` callbacks through the
component tree or write optimistic cache state.

### Route module boundaries

Keep `apps/web/src/routes/` focused on TanStack Router route modules and API endpoints rather
than using it as a feature-support tree.

- Define a React component in its route file when only that route uses it.
- Extract a component only when multiple modules reuse it or its size makes the route file
  unwieldy. Put extracted components in a feature directory under `apps/web/src/components/`.
- Put reusable hooks under `apps/web/src/hooks/` and non-React helpers, query utilities, and
  schemas under `apps/web/src/lib/`.
- Do not create support-only sibling directories such as `-todo/` or `-users/` beneath the route
  tree.

For example, the todo page keeps its route-only rows and summary in `todo.tsx`, while shared
auth UI lives under `components/auth/` and the larger settings cards live under
`components/settings/`.

## API routes

- `/api/auth/$`: Better Auth HTTP lifecycle
- `/api/rpc/$`: oRPC
- `/api/health/live`: liveness
- `/api/health/ready`: database readiness

Private upload intents are oRPC procedures; there is no upload HTTP router. Keep runtime
endpoints inside the route tree unless an adapter specifically requires otherwise.

Node and Cloudflare each emit a web-request event, while `/api/rpc` and its subpaths are
excluded because the oRPC integration owns those events. Both adapters propagate the
canonical `x-request-id`.

## React and client state

React Compiler is enabled. Do not add `useMemo`, `useCallback`, or `memo`.

- Use function components and destructure props in their signatures.
- Use default parameter values instead of `defaultProps`.
- Keep server state in TanStack Query and local UI state in React.
- Avoid state that can be derived during render.
- Use `key` when a form or panel must reset for a different record or fresh create flow.
- Prefer one mutation owner per row or card when items act independently.
- Keep simple event handlers inline; extract handlers only when reused or long.
- Use PascalCase component names and kebab-case files.

Client RPC access uses `orpc.<domain>.<action>.queryOptions(...)` and
`.mutationOptions(...)`.

## UI

Primitives come from `@base-ui/react`, not Radix. Base UI composition uses `render`, never
`asChild`:

```tsx
<DialogTrigger render={<Button />}>Open</DialogTrigger>
```

Treat `apps/web/src/components/ui/*` as upstream-style primitives. Put feature-specific
behavior in route-owned or app-level components.

- Use Tailwind v4 semantic tokens such as `bg-background`, `bg-muted`, `bg-primary`,
  `text-muted-foreground`, `border-border`, and `text-destructive`.
- Use `lucide-react` icons.
- Use `Dialog` for 1–3 fields, `Sheet` for 4–5 fields, and a dedicated route for larger or
  multi-step flows.
- Use `AlertDialog` for destructive confirmation.
- Give every form field a label and nearby validation feedback.
- Use `react-hook-form` with existing primitives.
- Keep list and table actions in the last column.

Useful references include `apps/web/src/components/ui/empty.tsx` and the navigation under
`apps/web/src/components/shell/`.

## Shared date helpers

Prefer helpers from `packages/shared/src/helpers/date.ts`, exported through
`@kitkit/shared/helpers/date`:

- `formatDate`, `formatTime`, `formatDateOnly`
- `formatRelativeTime`, `formatSmart`
- `toUTCString`, `getUserTimeZone`, `formatForDateTimeLocal`
- `isPast`, `isFuture`

Store database timestamps as `timestamptz`, serialize dates as ISO strings, and format them
at the UI edge. Import directly from `date-fns` only when the shared helpers are insufficient.
The starter intentionally does not depend on `lodash-es`; use plain JavaScript for small
transformations.
