# DevOps and Deployment

Deployment baseline for this Node-first app.

## Default Runtime

Node.js `>=24` is the default target.

```bash
pnpm build
pnpm start
```

## Optional Runtime

Cloudflare Workers support is not live. Read `docs/cloudflare.md` before runtime-specific changes.

## Request Context

`src/server/node-server.ts` creates one DB/auth/repo set at startup, then stores per-request state in `src/server/context.ts`.

Use:

- `getRequestContext()` for request state
- `requestStorage.run(...)` only in a server entry

The context shape is `headers`, `auth`, `session`, `db`, `repos`, and `waitUntil`.

## Required Environment

Minimum server env:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `VITE_BASE_URL`

Optional, depending on features:

- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `CRON_SECRET`
- S3 env from `docs/file-storage.md`

## Production Shape

- The app builds a single server output in `.output/server/`.
- There is no separate worker build or worker start script in the live repo.
- If you add one, document the exact process here and in `docs/commands.md`.
