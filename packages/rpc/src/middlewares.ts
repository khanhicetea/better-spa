import { ORPCError, os } from "@orpc/server";
import type { ServerAuthSession } from "@better-spa/auth/server";
import type { RateLimitPolicy, RequestContext } from "./context";

export const authMiddleware = os
  .$context<{ session: ServerAuthSession }>()
  .middleware(async ({ context, next }) => {
    if (!context.session) {
      throw new ORPCError("UNAUTHORIZED");
    }

    const result = await next({
      context: {
        user: context.session.user,
      },
    });

    return result;
  });

export const adminMiddleware = authMiddleware.concat(async ({ context, next }) => {
  if (context.user.role !== "admin") {
    throw new ORPCError("FORBIDDEN");
  }

  const result = await next();

  return result;
});

/**
 * Rate limiting middleware
 * Limits requests based on IP address or user ID
 */
export const rateLimitMiddleware = os
  .$context<RequestContext>()
  .middleware(async ({ context, next, path }) => {
    const procedure = path.join(".");
    const policy: RateLimitPolicy =
      procedure.startsWith("user.") && procedure !== "user.updateProfile" ? "admin" : "api";
    const identifier = context.session?.user?.id ?? context.clientIp;
    const limitResult = context.rateLimit.check(policy, identifier);

    if (!limitResult.allowed) {
      throw new ORPCError("RATE_LIMITED", {
        data: {
          retryAfter: limitResult.retryAfter,
        },
      });
    }

    try {
      return await next();
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error.code === "23505" || error.code === "23503")
      ) {
        throw new ORPCError("CONFLICT", {
          message: error.code === "23505" ? "A unique value is already in use" : "Conflict",
          cause: error,
        });
      }
      throw error;
    }
  });
