import { AsyncLocalStorage } from "node:async_hooks";
import type { ServerAuth, ServerAuthSession } from "@/lib/auth/init";
import type { DB } from "@/server/db/init";
import type { Repositories } from "@/server/db/repositories";
import type { Worker } from "@/server/worker";

export type RequestContext = {
  headers: Headers;
  auth: ServerAuth;
  session: ServerAuthSession;
  db: DB;
  repos: Repositories;
  worker: Worker;
  waitUntil: (promise: Promise<unknown>) => void;
};

// For Async Local Storage
export const workerCtx = new AsyncLocalStorage<RequestContext>();

export function getCurrentRequestContext() {
  const ctx = workerCtx.getStore();
  if (!ctx) throw new Error("No worker context");
  return ctx;
}

export function getRequestHeaders() {
  const ctx = getCurrentRequestContext();
  return ctx.headers;
}

export function getCurrentDB() {
  const ctx = getCurrentRequestContext();
  return ctx.db;
}

export function getCurrentAuth() {
  const ctx = getCurrentRequestContext();
  return ctx.auth;
}

export function getCurrentSession() {
  const ctx = getCurrentRequestContext();
  return ctx.session;
}

export function getCurrentRepos() {
  const ctx = getCurrentRequestContext();
  return ctx.repos;
}

export function getWaitUntil() {
  const ctx = getCurrentRequestContext();
  return ctx.waitUntil;
}

export function getCurrentWorker() {
  const ctx = getCurrentRequestContext();
  return ctx.worker;
}
