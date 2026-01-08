# DevOps & Deployment

**For Agents**: Read this doc when working on deployment or server configuration.

---

## Runtime Options

### Node.js (Default)

1. Use `vite.config.node.ts` as `vite.config.ts`
2. In `src/server.ts`, use `createNodeHandler` from `src/server/node-server.ts`

```bash
pnpm build
node .output/server/index.mjs
```

### Cloudflare Workers

See [docs/cloudflare.md](./cloudflare.md) for full guide.

1. Use `vite.config.cf.ts` as `vite.config.ts`
2. Update `src/server.ts` to use Cloudflare handler
3. Modify `RequestContext` creation for Cloudflare environment

## Request Context

The server uses `AsyncLocalStorage` (`src/server/context.ts`) to provide request-scoped context:

```typescript
// Available in any server code
import { getCurrentDB, getCurrentAuth, getCurrentSession, getCurrentRepos, getRequestHeaders } from "@/server/context";

const repos = getCurrentRepos();
const user = getCurrentSession()?.user;
```

## Environment Variables

### Development

Variables loaded automatically from `.env` file.

### Production

Set at system/container level:

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=...
VITE_BASE_URL=https://your-domain.com
```

## Production Architecture

```
┌─────────────────┐     ┌─────────────────┐
│  TanStack Start │     │   Job Worker    │
│     Server      │     │    Process      │
│                 │     │                 │
│ .output/server/ │     │ .output/worker/ │
│   index.mjs     │     │   worker.js     │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
              ┌──────┴──────┐
              │  PostgreSQL │
              │   Database  │
              └─────────────┘
```

Both server and worker share the same database and can run on same or different machines.

## Docker

See `Dockerfile` for containerized deployment.

## Fly.io

See `fly.toml` for Fly.io specific configuration.
