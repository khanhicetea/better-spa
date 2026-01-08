import { os } from "@orpc/server";
import * as z from "zod";
import type { ServerAuth, ServerAuthSession } from "@/lib/auth/init";
import type { DB } from "@/lib/db/init";
import type { Repositories } from "@/lib/db/repositories";
import type { Worker } from "@/worker";
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
    worker: Worker;
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
