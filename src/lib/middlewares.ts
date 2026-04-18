import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import {
  getCurrentAuth,
  getCurrentDB,
  getCurrentRepos,
  getCurrentSession,
  getWaitUntil,
} from "@/server/context";

export const dbMiddleware = createMiddleware().server(async ({ next }) => {
  const db = getCurrentDB();
  return next({ context: { db } });
});

export const reposMiddleware = createMiddleware()
  .middleware([dbMiddleware])
  .server(async ({ next }) => {
    const repos = getCurrentRepos();
    return next({ context: { repos } });
  });

export const betterAuthMiddleware = createMiddleware()
  .middleware([reposMiddleware])
  .server(async ({ next }) => {
    const auth = getCurrentAuth();
    return next({ context: { auth } });
  });

export const tryAuthMiddleware = createMiddleware()
  .middleware([betterAuthMiddleware])
  .server(async ({ next, request }) => {
    const headers = request.headers;
    const session = getCurrentSession();
    const waitUntil = getWaitUntil();
    return next({ context: { session, headers, waitUntil } });
  });

/**
 * Middleware to force authentication on server requests (including server functions), and add the user to the context.
 */
export const authMiddleware = createMiddleware()
  .middleware([tryAuthMiddleware])
  .server(async ({ next, context }) => {
    if (!context.session) {
      setResponseStatus(401);
      throw redirect({ to: "/login" });
    }

    return next({ context: { user: context.session.user } });
  });
