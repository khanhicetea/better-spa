import { os } from "@orpc/server";
import * as z from "zod";
import type { RequestContext } from "./context";
import { adminMiddleware, authMiddleware, rateLimitMiddleware } from "./middlewares";

export const baseProcedure = os
  .$context<RequestContext>()
  .errors({
    RATE_LIMITED: {
      message: "Too many requests",
      data: z.object({
        retryAfter: z.number(),
      }),
    },
    NOT_FOUND: {
      message: "Resource not found",
    },
    UNAUTHORIZED: {
      message: "Unauthorized",
    },
    FORBIDDEN: {
      message: "Forbidden",
    },
    CONFLICT: {
      message: "Conflict",
    },
    VALIDATION_FAILED: {
      message: "Validation failed",
    },
    SERVICE_UNAVAILABLE: {
      message: "Service unavailable",
    },
  })
  .use(rateLimitMiddleware);
export const authedProcedure = baseProcedure.use(authMiddleware);
export const adminProcedure = baseProcedure.use(adminMiddleware);
