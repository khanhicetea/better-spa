import type { RequestOptions } from "@tanstack/react-start/server";
import type { ServerEntry } from "@tanstack/react-start/server-entry";
import { env } from "@/env/server";
import { getAuthConfig } from "@/lib/auth/init";
import { getDatabase } from "@/lib/db/init";
import { createRepos } from "@/lib/db/repositories";
import { Worker } from "@/worker";
import { workerCtx } from "./context";

export function createNodeHandler(serverEntry: ServerEntry) {
  // Singleton DB, Auth, Repos, Worker
  const db = getDatabase(env.DATABASE_URL);
  const auth = getAuthConfig(db);
  const repos = createRepos(db);
  const worker = new Worker(db, repos);

  return {
    async fetch(request: Request, opts?: RequestOptions<undefined>) {
      const session = await auth.api.getSession({
        headers: request.headers,
      });

      // Check if request has native waitUntil (production serverless runtime)
      const nativeWaitUntil = (request as any).waitUntil;

      // Fallback for development: promise pool
      const promisePool: Promise<unknown>[] = [];

      const waitUntil = nativeWaitUntil
        ? (promise: Promise<unknown>) => nativeWaitUntil.call(request, promise)
        : (promise: Promise<unknown>) => {
            promisePool.push(
              promise.catch((error) => {
                console.error("waitUntil promise failed:", error);
              }),
            );
          };

      const reqCtx = {
        headers: request.headers,
        db,
        auth,
        session,
        repos,
        worker,
        waitUntil,
      };

      return workerCtx.run(reqCtx, async () => {
        try {
          const response = await serverEntry.fetch(request, {
            context: undefined,
          });

          // In development (no native waitUntil), wait for all promises after response
          if (!nativeWaitUntil && promisePool.length > 0) {
            Promise.allSettled(promisePool).then((results) => {
              const failed = results.filter((r) => r.status === "rejected");
              if (failed.length > 0) {
                console.error(`${failed.length} waitUntil promise(s) failed`);
              }
            });
          }

          return response;
        } catch (error) {
          console.error(error);
          return new Response("Node Server Error", { status: 500 });
        }
      });
    },
  };
}
