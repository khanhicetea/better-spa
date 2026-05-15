import { ORPCError, os } from "@orpc/server";
import type { ServerAuthSession } from "@/lib/auth/init";
import { apiRateLimiter } from "@/lib/rate-limiter";

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

export const adminMiddleware = authMiddleware.concat(
  async ({ context, next }) => {
    if (context.user.role !== "admin") {
      throw new ORPCError("UNAUTHORIZED");
    }

    const result = await next();

    return result;
  },
);

/**
 * Rate limiting middleware
 * Limits requests based on IP address or user ID
 */
export const rateLimitMiddleware = os
  .$context<{ session: ServerAuthSession; headers: Headers }>()
  .middleware(async ({ context, next }) => {
    // Use user ID if authenticated, otherwise use IP address from headers
    const identifier =
      context.session?.user?.id ||
      context.headers.get("x-forwarded-for") ||
      context.headers.get("x-real-ip") ||
      "unknown";

    const result = apiRateLimiter.check(identifier);

    if (!result.allowed) {
      throw new ORPCError("TOO_MANY_REQUESTS", {
        message: "Too many requests. Please try again later.",
        data: {
          limit: result.limit,
          resetAt: result.resetAt,
        },
      });
    }

    return next();
  });
