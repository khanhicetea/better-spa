# Cloudflare Workers Deployment

The repository has a dedicated Worker build using Wrangler `4.114.0` and
`@cloudflare/vite-plugin` `1.47.0`.

## Live files

- `apps/web/src/server/cloudflare-worker.ts`
- `apps/web/vite.worker.config.ts`
- `apps/web/wrangler.jsonc`
- `apps/web/worker-configuration.d.ts`

The configuration pins compatibility date `2026-07-27`, enables `nodejs_compat`, static
assets, Smart Placement, Worker logs, and sampled traces.

## PostgreSQL

`HYPERDRIVE` is required. Replace the placeholder ID in `apps/web/wrangler.jsonc` with a
real Hyperdrive configuration before deployment.

Each request builds Kysely/`pg`, auth, and repositories from
`env.HYPERDRIVE.connectionString`, then destroys the database client in `finally`. Never
cache request-bound Hyperdrive clients globally.

The Worker passes background promises with `ctx.waitUntil(promise)` without destructuring
the method. Request-scoped logging continues to use `AsyncLocalStorage`, supported through
`nodejs_compat`.

## Secrets and bindings

`HYPERDRIVE` and `ASSETS` are Wrangler bindings. Store application credentials as Worker
secrets:

```bash
wrangler secret put BETTER_AUTH_SECRET
wrangler secret put VITE_BASE_URL
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put S3_ENDPOINT
wrangler secret put S3_ACCESS_KEY_ID
wrangler secret put S3_SECRET_ACCESS_KEY
wrangler secret put S3_BUCKET_NAME
wrangler secret put S3_REGION
```

Only configure optional OAuth/storage pairs you actually use. `bootstrap.capabilities`
reflects complete configured pairs.

## Build and deploy

```bash
pnpm worker:types
pnpm build:worker
pnpm worker:dry-run
pnpm worker:deploy
```

The Vite plugin emits the deployable Wrangler configuration under
`apps/web/dist/server/wrangler.json`; deploy and dry-run scripts use that generated file.
Commit `worker-configuration.d.ts`. `pnpm worker:types:check` and CI fail when it drifts.

For local runtime smoke:

```bash
pnpm db:up
pnpm db:migrate
pnpm worker:preview
curl --fail http://127.0.0.1:4173/api/health/live
curl --fail http://127.0.0.1:4173/api/health/ready
```

Configure Cloudflare ingress rate-limit rules for general API traffic and stricter admin
and upload-intent traffic. Mutable in-isolate limit maps are deliberately not used.

References:

- [TanStack Start on Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/)
- [Hyperdrive with PostgreSQL drivers](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/)
- [Node.js AsyncLocalStorage compatibility](https://developers.cloudflare.com/workers/runtime-apis/nodejs/asynclocalstorage/)
