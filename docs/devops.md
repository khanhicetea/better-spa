# DevOps and Deployment

Deployment baseline for this repo.

## Default Runtime

Node.js is the default target.

```bash
pnpm build
node .output/server/index.mjs
```

## Optional Runtime

Cloudflare Workers is possible but not part of the live baseline. Read `docs/cloudflare.md` before making runtime-specific changes.

## Request Context

Server code depends on request-scoped context from `src/server/context.ts`.

Important helpers:

- `getCurrentDB()`
- `getCurrentAuth()`
- `getCurrentSession()`
- `getCurrentRepos()`
- `getRequestHeaders()`

If you change server entry behavior, preserve this context model.

## Required Environment

Minimum server env:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `VITE_BASE_URL`

Optional, depending on features:

- OAuth provider secrets
- `CRON_SECRET`
- S3 configuration

## Production Shape

- The app builds a single server output in `.output/server/`.
- There is no separate worker build or worker start script in the live repo.
- If you add one, document the exact process here and in `docs/commands.md`.
