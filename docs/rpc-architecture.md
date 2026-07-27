# RPC Architecture

Use oRPC only. Do not add tRPC routers, hooks, or naming conventions.

## Live structure

```text
packages/rpc/src/
  base.ts                 procedure definitions and typed errors
  context.ts              runtime-neutral request context
  dto.ts                  serialized output schemas and mappers
  middlewares.ts          auth, admin, rate-limit, and logging middleware
  rate-limiter.ts         Node limiter and Worker ingress adapter
  storage.ts              runtime-neutral S3-compatible signer
  router.ts
  handlers/
    app.ts
    file.ts
    todo.ts
    user.ts
```

Web integration:

- `apps/web/src/lib/orpc.ts`: client and TanStack Query helpers
- `apps/web/src/lib/orpc.server.ts`: server-side router client
- `apps/web/src/routes/api/rpc.$.ts`: HTTP endpoint and response-header forwarding

## Procedures and context

- `baseProcedure`: request context, request logging, and API rate limit
- `authedProcedure`: requires a session user
- `adminProcedure`: requires an admin and applies the stricter admin policy

The context contains request ID, request/response headers, auth/session, DB/repositories,
storage, rate limiter, runtime metadata, client address, and `waitUntil`.

## Live RPC surface

- `app.bootstrap`
- `file.createUploadIntents`
- `file.createReadUrl`
- `todo.list`, `todo.create`, `todo.update`, `todo.delete`
- `user.list`, `user.updateProfile`
- `user.create`, `user.ban`, `user.unban`, `user.resetPassword`,
  `user.impersonate`

The `user.*` admin mutations call Better Auth's server APIs from `adminProcedure`.
Impersonation uses oRPC response headers to forward Better Auth's cookie.

Ordinary sign-in, sign-up, sign-out, session, and account lifecycle remain Better Auth HTTP
operations. Invalidate `app.bootstrap` after any operation that changes session or profile
state.

## DTO and handler rules

- Keep one handler file per domain.
- Validate input and declare public output with Zod.
- Dates cross the boundary as ISO strings.
- Expose only fields the UI consumes.
- Prefer `context.repos` over raw Kysely.
- Put ownership into SQL mutation predicates, not a pre-check followed by a broad write.
- Return serialized values only.

Client queries use `orpc.domain.action.queryOptions(...)`; mutations use
`.mutationOptions(...)`. A feature-owned query module should invalidate its data on
successful writes.

## Typed errors

Public procedures use:

- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `CONFLICT`
- `VALIDATION_FAILED`
- `RATE_LIMITED` with `retryAfter` seconds
- `SERVICE_UNAVAILABLE`

PostgreSQL uniqueness and foreign-key errors map to `CONFLICT`. Expected client failures
are logged separately from unhandled server errors.

Avoid non-serializable values, UI-only ownership checks, optimistic updates, direct
browser-side admin writes, and long-running work hidden in `waitUntil`.
