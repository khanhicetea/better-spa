# Cloudflare Worker Support

Compact reference for making this app run on Cloudflare Workers.

## Status

Cloudflare is an optional target. The current baseline repo is Node-first and does not ship a finalized Cloudflare entry setup.

## What You Need

- `wrangler`
- `@cloudflare/vite-plugin`
- a Worker-compatible `vite.config.ts`
- a server entry that creates request-scoped DB, auth, repos, and `waitUntil`

## Required Adaptations

1. Swap Vite config to a Cloudflare-compatible setup.
2. Change `src/server.ts` to use a Worker handler instead of the Node handler.
3. Build request context per request using the Worker environment.
4. Preserve the same context contract used by `src/server/context.ts`.

## Request Context Requirements

For each request, initialize:

- `db`
- `auth`
- `session`
- `repos`
- `headers`
- `waitUntil`

Wrap request handling so server code can still access these values through the existing context helpers.

## Data Access Note

Do not reuse a Node-style singleton DB assumption. In a Worker environment, derive connections from the runtime bindings you actually have available.

## Documentation Rule

If you add real Cloudflare support, update:

- this file
- `docs/devops.md`
- `docs/commands.md`
- `AGENTS.md`

with the exact files, commands, and env bindings that the implementation requires.
