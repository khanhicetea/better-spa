import "@tanstack/react-start/server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import type { ServerAuth, ServerAuthSession } from "@/lib/auth/server";
import type { DB } from "@/server/db/client";
import type { Repositories } from "@/server/db/repositories";

export type RequestContext = {
  headers: Headers;
  auth: ServerAuth;
  session: ServerAuthSession;
  db: DB;
  repos: Repositories;
  waitUntil: (promise: Promise<unknown>) => void;
};

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
