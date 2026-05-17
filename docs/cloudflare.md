# Cloudflare Worker Support

Cloudflare is optional. The live repo is Node-first and does not ship a finalized Worker entry.

## If You Add Worker Support

You need:

- `wrangler`
- `@cloudflare/vite-plugin`
- a Worker-compatible `vite.config.ts`
- a Worker server entry that preserves the existing request context contract

## Required Adaptations

1. Replace the Node server entry with a Worker handler.
2. Build request-scoped context from the Worker environment.
3. Preserve the same context shape used by `src/server/context.ts`.

Each request must initialize:

- `db`
- `auth`
- `session`
- `repos`
- `headers`
- `waitUntil`

## Data Access Rule

Do not assume a Node-style singleton DB. Build connections from the Worker bindings available for that request.

## Documentation Rule

If you add real Cloudflare support, update:

- this file
- `docs/devops.md`
- `docs/commands.md`
- `AGENTS.md`

Document exact files, commands, and env bindings. Do not leave runtime details implied.
