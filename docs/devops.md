# DevOps and Deployment

Compact deployment reference.

## Default Runtime

Node.js is the default deployment target.

Build and run:

```bash
pnpm build
node .output/server/index.mjs
```

## Optional Runtime

Cloudflare Workers is possible but not the default baseline. See `docs/cloudflare.md` before making runtime-specific changes.

## Request Context

Server code depends on request-scoped context from `src/server/context.ts`.

Available helpers include:

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

The live repo builds a single app server output under `.output/server/`.

The repo does not currently define a separate worker build or worker start script. If you add one, document the exact process here and in `docs/commands.md`.
