import type { RequestOptions } from "@tanstack/react-start/server";
import type { ServerEntry } from "@tanstack/react-start/server-entry";
import { getDatabase } from "@better-spa/db/client";
import { createRepos } from "@better-spa/db/repositories";
import { getAuthConfig } from "@better-spa/auth/server";
import { createRequestContext, requestStorage, type RequestContext } from "@better-spa/rpc/context";
import { InMemoryRateLimitService } from "@better-spa/rpc/rate-limiter";
import { createS3StorageSigner } from "@better-spa/rpc/storage";
import { logger, runWithLogContext } from "@better-spa/observability";
import webPackage from "../../package.json";
import { env } from "@/env/server";

const db = getDatabase(env.DATABASE_URL);
const repos = createRepos(db);
const rateLimit = new InMemoryRateLimitService();
const oauthProviders: Array<"github" | "google"> = [];

if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) oauthProviders.push("github");
if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) oauthProviders.push("google");

const auth = getAuthConfig({
  db,
  baseURL: env.VITE_BASE_URL,
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

const storage =
  env.S3_ENDPOINT && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY && env.S3_BUCKET_NAME
    ? createS3StorageSigner({
        endpoint: env.S3_ENDPOINT,
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
        bucket: env.S3_BUCKET_NAME,
        region: env.S3_REGION ?? "auto",
      })
    : null;

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("Graceful shutdown started", { signal });
  rateLimit.destroy();
  await db.destroy();
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));

function trustedClientIp(headers: Headers): string {
  const trustProxy = env.TRUST_PROXY?.trim().toLowerCase();
  if (!trustProxy || trustProxy === "false" || trustProxy === "0") return "direct";
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const addresses = forwarded
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (trustProxy === "true") return addresses[0] ?? "unknown";

    const hops = Number.parseInt(trustProxy, 10);
    if (Number.isFinite(hops) && hops > 0) {
      return addresses.at(-hops) ?? addresses[0] ?? "unknown";
    }
    return "direct";
  }
  return headers.get("x-real-ip") ?? "unknown";
}

function createWaitUntil() {
  const pending = new Set<Promise<unknown>>();
  return {
    waitUntil(promise: Promise<unknown>) {
      const tracked = promise
        .catch((error) => logger.error("waitUntil promise failed", { error }))
        .finally(() => pending.delete(tracked));
      pending.add(tracked);
    },
    drain() {
      if (pending.size > 0) {
        void Promise.allSettled(pending);
      }
    },
  };
}

function apiBodyTooLarge(request: Request): boolean {
  if (!new URL(request.url).pathname.startsWith("/api/")) return false;
  const length = Number(request.headers.get("content-length") ?? 0);
  return Number.isFinite(length) && length > env.API_BODY_LIMIT_BYTES;
}

function rebuildRequest(
  request: Request,
  options: { body?: BodyInit | null; signal?: AbortSignal } = {},
): Request {
  const canHaveBody = request.method !== "GET" && request.method !== "HEAD";
  const body = canHaveBody ? (options.body ?? request.body) : undefined;
  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers: request.headers,
    body,
    signal: options.signal,
  };
  if (body !== undefined && body !== null) init.duplex = "half";
  return new Request(request.url, init);
}

async function enforceApiBodyLimit(request: Request): Promise<Request | Response> {
  if (
    !new URL(request.url).pathname.startsWith("/api/") ||
    request.method === "GET" ||
    request.method === "HEAD" ||
    !request.body
  ) {
    return request;
  }
  if (apiBodyTooLarge(request)) {
    return new Response("Payload Too Large", { status: 413 });
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > env.API_BODY_LIMIT_BYTES) {
      await reader.cancel();
      return new Response("Payload Too Large", { status: 413 });
    }
    chunks.push(value);
  }

  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return rebuildRequest(request, { body });
}

function applyResponseHeaders(response: Response, context: RequestContext): Response {
  const headers = new Headers(response.headers);
  headers.set("x-request-id", context.requestId);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function createNodeHandler(serverEntry: ServerEntry) {
  return {
    async fetch(request: Request, _opts?: RequestOptions<undefined>) {
      const requestId = crypto.randomUUID();
      const path = new URL(request.url).pathname;

      return runWithLogContext({ requestId, runtime: "node", path }, async () => {
        const startedAt = Date.now();
        const boundedRequest = await enforceApiBodyLimit(request);
        if (boundedRequest instanceof Response) {
          boundedRequest.headers.set("x-request-id", requestId);
          return boundedRequest;
        }

        const controller = new AbortController();
        const deadline = setTimeout(() => controller.abort(), env.REQUEST_DEADLINE_MS);
        deadline.unref();
        const deadlineRequest = rebuildRequest(boundedRequest, { signal: controller.signal });
        const session = await auth.api.getSession({ headers: request.headers });
        const background = createWaitUntil();
        const context = createRequestContext({
          requestId,
          headers: request.headers,
          auth,
          session,
          db,
          repos,
          storage,
          rateLimit,
          waitUntil: background.waitUntil,
          runtime: "node",
          environment:
            process.env.NODE_ENV === "production"
              ? "production"
              : process.env.NODE_ENV === "test"
                ? "test"
                : "development",
          appVersion: webPackage.version,
          oauthProviders,
          clientIp: trustedClientIp(request.headers),
        });

        return requestStorage.run(context, async () => {
          try {
            const response = await serverEntry.fetch(deadlineRequest, { context: undefined });
            logger.info("HTTP request completed", {
              method: request.method,
              durationMs: Date.now() - startedAt,
              resultClass: `${Math.floor(response.status / 100)}xx`,
            });
            return applyResponseHeaders(response, context);
          } catch (error) {
            logger.error("Node server request failed", {
              error,
              method: request.method,
              durationMs: Date.now() - startedAt,
              resultClass: "5xx",
            });
            return new Response("Internal Server Error", {
              status: 500,
              headers: { "x-request-id": requestId },
            });
          } finally {
            clearTimeout(deadline);
            background.drain();
          }
        });
      });
    },
  };
}
