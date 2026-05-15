import { os } from "@orpc/server";
import * as z from "zod";
import type { RequestContext } from "@/server/context";
import { adminMiddleware, authMiddleware, rateLimitMiddleware } from "./middlewares";

export const baseProcedure = os
  .$context<RequestContext>()
  .errors({
    RATE_LIMITED: {
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
  })
  .use(rateLimitMiddleware);
export const publicProcedure = baseProcedure;
export const authedProcedure = baseProcedure.use(authMiddleware);
export const adminProcedure = baseProcedure.use(adminMiddleware);
