import { os } from "@orpc/server";
import * as z from "zod";
import type { ServerAuth, ServerAuthSession } from "@/lib/auth/server";
import type { DB } from "@/server/db/init";
import type { Repositories } from "@/server/db/repositories";
import {
  adminMiddleware,
  authMiddleware,
  rateLimitMiddleware,
} from "./middlewares";

export const baseProcedure = os
  .$context<{
    headers: Headers;
    session: ServerAuthSession;
    db: DB;
    auth: ServerAuth;
    repos: Repositories;
    waitUntil: (promise: Promise<unknown>) => void;
  }>()
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
