import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { getRequestContext } from "@better-spa/rpc/context";

/**
 * Injects the full request context (db, auth, repos, session, waitUntil)
 * into the TanStack middleware chain in a single step.
 */
export const requestContextMiddleware = createMiddleware().server(async ({ next, request }) => {
  const ctx = getRequestContext();
  return next({
    context: {
      db: ctx.db,
      auth: ctx.auth,
      repos: ctx.repos,
      session: ctx.session,
      headers: request.headers,
      waitUntil: ctx.waitUntil,
    },
  });
});

/**
 * Middleware to force authentication on server requests (including server functions), and add the user to the context.
 */
export const authMiddleware = createMiddleware()
  .middleware([requestContextMiddleware])
  .server(async ({ next, context }) => {
    if (!context.session) {
      setResponseStatus(401);
      throw redirect({ to: "/login" });
    }

    return next({ context: { user: context.session.user } });
  });
