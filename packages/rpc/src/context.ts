import { AsyncLocalStorage } from "node:async_hooks";
import type { DB } from "@better-spa/db/client";
import type { Repositories } from "@better-spa/db/repositories";
import type { ServerAuth, ServerAuthSession } from "@better-spa/auth/server";
import type { RuntimeName } from "@better-spa/observability";
import type { StorageSigner } from "./storage";

export type RateLimitPolicy = "api" | "admin" | "upload";

export type RateLimitResult = {
  allowed: boolean;
  retryAfter: number;
};

export interface RateLimitService {
  check(policy: RateLimitPolicy, identifier: string): RateLimitResult;
  destroy?(): void;
}

export type RequestContextOptions = {
  requestId: string;
  headers: Headers;
  auth: ServerAuth;
  session: ServerAuthSession;
  db: DB;
  repos: Repositories;
  storage: StorageSigner | null;
  rateLimit: RateLimitService;
  responseHeaders?: Headers;
  waitUntil: (promise: Promise<unknown>) => void;
  runtime: RuntimeName;
  environment: "development" | "production" | "test";
  appVersion: string;
  oauthProviders: Array<"github" | "google">;
  clientIp: string;
};

export type RequestContext = {
  requestId: string;
  headers: Headers;
  auth: ServerAuth;
  session: ServerAuthSession;
  db: DB;
  repos: Repositories;
  storage: StorageSigner | null;
  rateLimit: RateLimitService;
  resHeaders: Headers;
  waitUntil: (promise: Promise<unknown>) => void;
  runtime: RuntimeName;
  environment: "development" | "production" | "test";
  appVersion: string;
  oauthProviders: Array<"github" | "google">;
  clientIp: string;
};

export function createRequestContext(options: RequestContextOptions): RequestContext {
  return {
    requestId: options.requestId,
    headers: options.headers,
    auth: options.auth,
    session: options.session,
    db: options.db,
    repos: options.repos,
    storage: options.storage,
    rateLimit: options.rateLimit,
    resHeaders: options.responseHeaders ?? new Headers(),
    waitUntil: options.waitUntil,
    runtime: options.runtime,
    environment: options.environment,
    appVersion: options.appVersion,
    oauthProviders: options.oauthProviders,
    clientIp: options.clientIp,
  };
}

/**
 * Async-local request context.
 * `requestStorage` is the raw ALS instance — only the server handler should call `.run()`.
 * Everything else should use `getRequestContext()`.
 */
export const requestStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Return the current per-request context. Throws if called outside a request.
 */
export function getRequestContext(): RequestContext {
  const ctx = requestStorage.getStore();
  if (!ctx) throw new Error("No request context — are you inside a request handler?");
  return ctx;
}
