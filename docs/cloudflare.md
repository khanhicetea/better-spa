# Cloudflare Worker Support

**For Agents**: Read this doc when deploying to Cloudflare Workers.

---

To deploy this application on Cloudflare Workers, follow these instructions.

## Prerequisites

To use Cloudflare, you need to install the following dependencies:

```bash
pnpm add -D wrangler @cloudflare/vite-plugin
```

### Vite Configuration

Create a file named `vite.config.ts` (or swap your existing one) with the following content optimized for Cloudflare Workers:

```typescript
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    devtools(),
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart(),
    viteReact({
      // https://react.dev/learn/react-compiler
      babel: {
        plugins: [
          [
            "babel-plugin-react-compiler",
            {
              target: "19",
            },
          ],
        ],
      },
    }),
    tailwindcss(),
  ],
  build: {
    rolldownOptions: {
      external: ["cloudflare:workers"],
    },
  },
});
```

### Wrangler Configuration

Create a file named `wrangler.jsonc` (or swap your existing one) with the following content:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "shell-spa",
  "compatibility_date": "2025-11-17",
  "compatibility_flags": [
    "nodejs_compat",
    "enable_request_signal",
    "request_signal_passthrough",
    "no_handle_cross_request_promise_resolution",
  ],
  // "main": "@tanstack/react-start/server-entry",
  "main": "./src/server.ts",
  "placement": {
    "mode": "smart",
  },
  "assets": {},
  "observability": {
    "enabled": true,
    "head_sampling_rate": 1,
    "logs": {
      "enabled": true,
      "head_sampling_rate": 1,
      "persist": true,
      "invocation_logs": true,
    },
    "traces": {
      "enabled": true,
      "persist": true,
      "head_sampling_rate": 1,
    },
  },
  "hyperdrive": [
    {
      "binding": "HYPERDRIVE",
      "id": "77ef4c39bd824a4083d5437af06eaf28",
    },
  ],
}
```

Note: Use `vite^7.3` for compatibility if you encounter issues with newer versions.

## Commands

These commands allow you to interact with Cloudflare Workers:

- **Run Wrangler CLI**: `npx wrangler`
- **Deploy**: `pnpm run build && npx wrangler deploy`
- **Generate Types**: `npx wrangler types`

## Worker Handler

The Cloudflare Worker handler implementation is not included in the main source to avoid conflicts with Node.js environments.

To use it, create a file (e.g., `src/server/cloudflare-worker.ts`) with the following content:

```typescript
import type { ServerEntry } from "@tanstack/react-start/server-entry";
import { getAuthConfig } from "@/lib/auth/init";
import { getDatabase } from "@/server/db/init";
import { createRepos } from "@/server/db/repositories";
import { workerCtx } from "./context";

export function createCloudflareHandler(serverEntry: ServerEntry) {
  return {
    // @ts-ignore
    async fetch(request: Request, env: Env, ctx: ExecutionContext) {
      const db = getDatabase(env.HYPERDRIVE.connectionString);
      const auth = getAuthConfig(db);
      const repos = createRepos(db);
      const session = await auth.api.getSession({
        headers: request.headers,
      });

      const reqCtx = {
        headers: request.headers,
        db,
        auth,
        session,
        repos,
      };

      return workerCtx.run(reqCtx, async () => {
        try {
          return serverEntry.fetch(request, {
            context: {
              // @ts-ignore
              env,
              // @ts-ignore
              waitUntil: ctx.waitUntil.bind(ctx),
              // @ts-ignore
              passThroughOnException: ctx.passThroughOnException.bind(ctx),
            },
          });
        } catch (error) {
          console.error(error);
          return new Response("Cloudflare Worker Error", { status: 500 });
        }
      });
    },
  };
}
```

## Server Setup

You will need to modify `src/server.ts` to use `createCloudflareHandler` instead of the Node handler.

## Request Scope and Context

Understanding how context is propagated is crucial for the application to function correctly on Cloudflare Workers.

### 1. Initialization per Request

Unlike Node.js where the database connection might be a singleton, in Cloudflare Workers with Hyperdrive, we initialize the database connection **per request** using `env.HYPERDRIVE.connectionString`.

```typescript
const db = getDatabase(env.HYPERDRIVE.connectionString);
const auth = getAuthConfig(db);
const repos = createRepos(db);
```

### 2. Context Object (`reqCtx`)

We bundle these initialized services along with the request headers into a `RequestContext` object:

```typescript
const reqCtx = {
  headers: request.headers,
  db,
  auth,
  session,
  repos,
};
```

### 3. AsyncLocalStorage (`workerCtx`)

We use `workerCtx` (instance of `AsyncLocalStorage` from `src/server/context.ts`) to wrap the request handling. This allows deeply nested server-side code (like generic server functions or loaders) to access `db`, `auth`, `repos`, etc., without threading arguments through every function call.

```typescript
return workerCtx.run(reqCtx, async () => {
  // Inside here, calls to getCurrentDB(), getCurrentAuth() etc. will work
  return serverEntry.fetch(...)
});
```

This ensures that `getCurrentDB()` returns the correct database instance connected via Hyperdrive for the current request.
