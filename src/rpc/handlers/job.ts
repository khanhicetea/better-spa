import { z } from "zod";
import { workerRpc } from "@/server/worker/rpc";
import type { JobPayload } from "@/server/worker/types";
import { JobPriority } from "@/server/db/schema/job";
import { adminProcedure, authedProcedure } from "../base";

const jobStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);

const jobTypeSchema = z.string().refine((val) => val in workerRpc, {
  message: `Invalid job type. Available: ${Object.keys(workerRpc).join(", ")}`,
});

export const create = adminProcedure
  .input(
    z.object({
      type: jobTypeSchema,
      label: z.string().optional(),
      payload: z.unknown().optional(),
      maxRetries: z.number().int().min(0).max(10).default(3),
      priority: z.nativeEnum(JobPriority).optional(),
      runAt: z.date().optional(),
    }),
  )
  .handler(async ({ input, context }) => {
    const { repos } = context;
    const job = await repos.job.createJob({
      userId: context.user.id,
      type: input.type as keyof typeof workerRpc,
      label: input.label,
      payload: input.payload as JobPayload<keyof typeof workerRpc>,
      maxRetries: input.maxRetries,
      priority: input.priority,
      runAt: input.runAt,
    });
    return job;
  });

export const get = authedProcedure
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context, errors }) => {
    const { repos } = context;
    const job = await repos.job.findVisibleJobById({
      id: input.id,
      requesterUserId: context.user.id,
      isAdmin: context.user.role === "admin",
    });

    if (!job) {
      throw errors.NOT_FOUND();
    }

    return job;
  });

export const listAdmin = adminProcedure
  .input(
    z.object({
      userId: z.string().optional(),
      type: z.string().optional(),
      status: jobStatusSchema.optional(),
      limit: z.number().int().min(1).max(100).default(20),
    }),
  )
  .handler(async ({ input, context }) => {
    const { repos } = context;
    return repos.job.findAdminJobs(input);
  });

export const list = authedProcedure
  .input(
    z.object({
      jobId: z.string().optional(),
      status: jobStatusSchema.optional(),
      limit: z.number().int().min(1).max(100).default(20),
    }),
  )
  .handler(async ({ input, context }) => {
    const { repos } = context;
    return repos.job.findUserJobs({
      userId: context.user.id,
      id: input.jobId,
      status: input.status,
      limit: input.limit,
    });
  });

export const cancel = authedProcedure
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context, errors }) => {
    const { repos } = context;
    const updated = await repos.job.cancelPendingJob({
      id: input.id,
      requesterUserId: context.user.id,
      isAdmin: context.user.role === "admin",
    });

    if (!updated) {
      throw errors.NOT_FOUND({
        message: "Job not found or cannot be cancelled (must be pending)",
      });
    }

    return updated;
  });
