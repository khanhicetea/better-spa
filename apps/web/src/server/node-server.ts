import type { RequestOptions } from "@tanstack/react-start/server";
import type { ServerEntry } from "@tanstack/react-start/server-entry";
import { getDatabase } from "@better-spa/db/client";
import { createRepos } from "@better-spa/db/repositories";
import { getAuthConfig } from "@better-spa/auth/server";
import { requestStorage } from "@better-spa/rpc/context";
import { logger } from "@better-spa/shared/logger";
import { env } from "@/env/server";

function createWaitUntil(request: Request) {
  const nativeWaitUntil = (request as any).waitUntil;
  if (nativeWaitUntil) {
    return {
      waitUntil: (p: Promise<unknown>) => nativeWaitUntil.call(request, p),
      drain: undefined,
    };
  }

  const pool: Promise<unknown>[] = [];
  return {
    waitUntil: (p: Promise<unknown>) => {
      pool.push(
        p.catch((error) => {
          logger.error("waitUntil promise failed", { error });
        }),
      );
    },
    drain: () => {
      if (pool.length === 0) return;
      Promise.allSettled(pool).then((results) => {
        const failed = results.filter((r) => r.status === "rejected");
        if (failed.length > 0) {
          logger.error("waitUntil promises failed", { failedCount: failed.length });
        }
      });
    },
  };
}

export function createNodeHandler(serverEntry: ServerEntry) {
  const db = getDatabase(env.DATABASE_URL);
  const auth = getAuthConfig({
    db,
    socialProviders: {
      ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
        ? {
            github: {
              clientId: env.GITHUB_CLIENT_ID,
              clientSecret: env.GITHUB_CLIENT_SECRET,
            },
          }
        : {}),
      ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
            },
          }
        : {}),
    },
  });
  const repos = createRepos(db);

  return {
    async fetch(request: Request, _opts?: RequestOptions<undefined>) {
      const session = await auth.api.getSession({ headers: request.headers });
      const { waitUntil, drain } = createWaitUntil(request);

      const ctx = { headers: request.headers, db, auth, session, repos, waitUntil };

      return requestStorage.run(ctx, async () => {
        try {
          const response = await serverEntry.fetch(request, { context: undefined });
          drain?.();
          return response;
        } catch (error) {
          logger.error("Node server request failed", { error });
          return new Response("Node Server Error", { status: 500 });
        }
      });
    },
  };
}
