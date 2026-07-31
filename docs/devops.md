# Node Deployment

Node.js 24 is the default production runtime.

```bash
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm build:node
pnpm start
```

`pnpm preview` is the local equivalent and loads the repository `.env`.

## Runtime design

`apps/web/src/server/node-server.ts` owns one process-level `pg.Pool`/Drizzle resource,
Better Auth, repository, storage, and rate-limit set. Each request receives a runtime-neutral context
from `packages/rpc/src/context.ts`.

The adapter:

- creates or propagates request state and returns `x-request-id`
- emits evlog wide events for web and RPC requests plus structured infrastructure/DB logs
- applies a configurable 1 MiB API body limit
- applies a configurable 30-second request deadline
- parses forwarded addresses only when `TRUST_PROXY` is configured
- uses per-user buckets where a session exists, with stricter admin/upload policies
- unreferences cleanup/deadline timers
- drains lightweight post-response work and closes the PostgreSQL pool on graceful shutdown

Set `TRUST_PROXY=true` to trust the first forwarded address, or an integer hop count for a
known proxy chain. Leave it unset/false when the app is directly reachable.

## Configuration

Required:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `VITE_BASE_URL`

Optional:

- `HOST`
- `DATABASE_MAX_CONNECTIONS`
- `TRUST_PROXY`
- `API_BODY_LIMIT_BYTES`
- `REQUEST_DEADLINE_MS`
- `LOG_LEVEL`
- OAuth credentials
- private S3-compatible credentials from `docs/file-storage.md`

Never log or expose cookies, authorization, passwords, OAuth tokens, database URLs, or
storage credentials.

Evlog uses built-in PII redaction plus explicit sensitive-key paths. `LOG_LEVEL` continues
to control the existing infrastructure logger; evlog request-event volume should be managed
through its sampling configuration when a production drain is added.

## Health

- `GET /api/health/live` verifies the server is handling requests.
- `GET /api/health/ready` verifies PostgreSQL and the expected schema are reachable.

Both return runtime and request ID data. Use readiness for load-balancer admission and
liveness for process restart decisions.

Cloudflare deployment is a separate build and entry; see `docs/cloudflare.md`.
