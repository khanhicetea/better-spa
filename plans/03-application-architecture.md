# Application architecture plan

## Goal

Preserve the simple shell-SPA model while making request, auth, data, write, and runtime boundaries explicit and enforceable.

## Current request shape

```text
Node server entry
  -> create DB/auth/repos once
  -> resolve Better Auth session for every request
  -> place request state in AsyncLocalStorage
  -> TanStack Start server entry
      -> local oRPC client during SSR/loaders
      -> /api/rpc for browser calls
```

This is a reasonable Node architecture. The main problems are contract drift and unclear exceptions, not the number of layers.

## Immediate risks

1. The upload endpoint has no visible authentication or ownership policy.
2. RPC rate-limit declarations and thrown errors do not match.
3. The in-memory limiter is process-local, trusts forwarding headers directly, and exports unused limiter variants.
4. Admin identity writes call Better Auth directly while the project says all writes use RPC.
5. RPC responses expose inferred database rows without explicit output DTOs.
6. Todo update/delete perform a read followed by an ID-only write instead of one ownership-scoped write.
7. Username availability is checked before update, but the race must ultimately be handled by the unique index and mapped to a typed conflict error.
8. The generic repository uses extensive casts and can make empty-condition bulk writes possible.
9. `findPaginated` applies `modify` only to the item query, so future filters added through `modify` can disagree with the count.

## Target boundaries

### Identity, domain, and file writes

Adopt and document these exceptions:

- **Better Auth HTTP API:** sign in, sign up, sign out, password/session, and social-account lifecycle.
- **oRPC:** all application/domain writes and any admin orchestration that needs app audit/error policy.
- **Upload endpoint:** byte transfer only, after an authenticated/scoped upload intent; metadata persistence remains an oRPC write.
- **Database:** only repositories/domain queries and Better Auth's adapter access it.

For admin create/ban/unban/password/impersonation, choose one policy:

- keep direct Better Auth calls and explicitly classify them as identity lifecycle, or
- preferably wrap server-side Better Auth admin APIs in `adminProcedure` for uniform audit logs, rate limits, and typed errors.

Do not proxy ordinary sign-in/sign-out through oRPC merely for consistency.

### Upload authorization

Before treating uploads as production-ready:

1. Require a session in `api/upload.$.ts`.
2. Scope object keys, for example `users/{userId}/...` or `tenants/{tenantId}/...`.
3. Use an explicit MIME/extension allowlist and verify content where the storage library permits it.
4. Return stable private metadata (`key`, `bucket`, size, content type), not a durable authorization decision.
5. Generate private read URLs only from an authenticated RPC that checks ownership.
6. Add quotas/rate limits and lifecycle cleanup for abandoned uploads.
7. Define whether public uploads are truly public; avoid a generic public route by default.

### RPC contracts and errors

1. Define one typed error vocabulary: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `VALIDATION_FAILED`, and `RATE_LIMITED`.
2. Make middleware throw exactly the errors declared by the base procedure, including `retryAfter` shape.
3. Add explicit output schemas/DTO mappers at trust boundaries, especially user/admin records.
4. Never return raw internal auth/account rows to clients by default.
5. Map PostgreSQL unique/foreign-key violations to typed domain errors.
6. Log expected 4xx errors differently from unhandled 5xx errors.

## Make the shell architecture real

The current `app.shellData` response is unused. Choose one of two coherent designs.

### Recommended: one meaningful bootstrap

Create a single `app.bootstrap` query with a small serialized contract:

```ts
{
  app: { name, version, environment },
  user: UserSummary | null,
  preferences: { theme, timezone },
  capabilities: { socialProviders, uploads }
}
```

Then:

1. load it at the root shell boundary during SSR
2. seed the auth query from `bootstrap.user`
3. avoid a second user lookup unless an app profile field is missing from the session
4. use its values in HTML/theme/navigation so the request is not ceremonial
5. invalidate bootstrap/auth together on identity/profile transitions

Keep the payload stable and small. Do not place page data in it.

### Simpler alternative

If the app has no real shell settings, remove `shellData`, `preloadBetterSpa`, and `useShellData`. Keep route-level auth and describe the app honestly as a data-only SPA branch with SSR auth guards.

## Route and Query conventions

1. Define one query-options factory per server query and reuse it in loaders/components.
2. Await `ensureQueryData` when a component immediately uses `useSuspenseQuery`; do not fire-and-forget a required prefetch.
3. Add the missing todo loader prefetch and await admin list prefetches.
4. Put search parsing, loader dependencies, and prefetch in route files; keep table/form rendering in sibling `-folders`.
5. Invalidate query keys through feature-owned helpers instead of passing `refetch` callbacks through many layers.
6. Continue avoiding optimistic updates where concurrency correctness matters.
7. Define auth freshness deliberately. `staleTime: Infinity` is safe only if every sign-in, sign-out, impersonation, profile, and deletion path invalidates or clears it.

## Database and domain access

Keep Kysely and the repository layer, but narrow the generic abstraction.

1. Retain generic CRUD only for safe, simple access.
2. Add domain methods for security-sensitive operations, for example:
   - `todoItem.updateOwned(userId, id, patch)`
   - `todoItem.deleteOwned(userId, id)`
   - `user.listAdminPage(filter)`
3. Make ownership conditions part of the SQL write and check the affected/returned row.
4. Add explicit guards against empty-condition bulk update/delete.
5. Make pagination count and item filters share one query definition.
6. Add transaction helpers only when a use case spans multiple writes.
7. Validate DB pool settings and add timeouts/application name; expose graceful `destroy()` during shutdown.
8. Prefer cursor pagination for large, mutable lists; offset pagination is acceptable for the current admin demo.

Do not add a service layer to every handler. Introduce a domain service only when logic spans repositories, external systems, a transaction, or multiple transports.

## Rate limiting and request security

1. Treat the current in-memory limiter as development/single-process only.
2. Parse client identity only from a configured trusted proxy chain; never trust arbitrary `x-forwarded-for` values.
3. Apply stricter policies to sensitive mutations, not the same global bucket to every shell/query call.
4. In multi-instance production, enforce broad limits at the ingress and use Redis/Valkey only when per-user distributed limits are required.
5. Verify same-origin/CSRF behavior for cookie-authenticated oRPC and upload writes.
6. Add request body limits and timeouts at the HTTP adapter.

## Runtime boundary

1. Keep `AsyncLocalStorage` in the Node adapter, not in a supposedly portable core contract.
2. Extract a request-context factory that accepts runtime services and returns the oRPC context.
3. Keep Node as the documented production runtime.
4. Remove or clearly label `NITRO_PRESET=cloudflare-module` until a Worker entry, compatible DB connector, env bindings, and build smoke test exist.
5. Remove `waitUntil` until used, or document it as best-effort telemetry only on Node. It is not a job queue.
6. Add liveness/readiness behavior and graceful shutdown for DB connections.

## Observability

- Generate a request ID at the HTTP boundary and include it in RPC/error logs and response headers.
- Replace JSON-stringifying `Error` objects with structured serialization including name, message, stack, and cause.
- Redact cookies, authorization headers, passwords, OAuth tokens, and S3 credentials.
- Record request duration, RPC procedure, result class, and DB duration without logging query values by default.
- Add external error reporting/OpenTelemetry only after stable structured logs exist.

## Delivery sequence

1. Authenticate/scope uploads.
2. Fix typed rate-limit and conflict errors.
3. Decide and implement bootstrap versus removal.
4. Normalize awaited route prefetching and auth invalidation.
5. Add ownership-scoped domain repository methods.
6. Extract the Node runtime adapter/context factory.
7. Add structured request logging and production rate-limit infrastructure only when deployment topology requires it.

## Acceptance criteria

- Every write path has a documented owner and auth policy.
- Anonymous callers cannot create objects or receive private read URLs.
- Runtime errors conform to declared oRPC error types.
- No query fetched at shell entry is unused.
- Required route data is present before a suspense component renders.
- Security-sensitive writes include ownership in the SQL predicate.
- The production runtime promise matches a checked-in entry and CI build.
