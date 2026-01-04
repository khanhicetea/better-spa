import { z } from "zod";
import type { JobStatus } from "@/lib/db/schema/job";
import { authedProcedure } from "../base";

const jobStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);

export const createJob = authedProcedure
  .input(
    z.object({
      type: z.string().min(1),
      label: z.string().min(1),
      payload: z.unknown().optional(),
      maxRetries: z.number().int().min(0).max(10).default(3),
    }),
  )
  .handler(async ({ input, context }) => {
    const { repos } = context;
    const job = await repos.job.insertReturn({
      id: crypto.randomUUID(),
      userId: context.user.id,
      type: input.type,
      label: input.label,
      status: "pending" as JobStatus,
      progress: 0,
      payload: input.payload ?? null,
      result: null,
      error: null,
      retryCount: 0,
      maxRetries: input.maxRetries,
      startedAt: null,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return job ?? null;
  });

export const getJob = authedProcedure
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context, errors }) => {
    const { repos } = context;
    const job = await repos.job.findById(input.id);

    if (!job || job.userId !== context.user.id) {
      throw errors.NOT_FOUND();
    }

    return job;
  });

export const listJobs = authedProcedure
  .input(
    z.object({
      jobId: z.string().optional(),
      status: jobStatusSchema.optional(),
      limit: z.number().int().min(1).max(100).default(20),
    }),
  )
  .handler(async ({ input, context }) => {
    const { repos } = context;

    return repos.job.find({
      where: (qb) => {
        let query = qb.where("userId", "=", context.user.id);

        if (input.jobId) {
          query = query.where("id", "=", input.jobId);
        }
        if (input.status) {
          query = query.where("status", "=", input.status);
        }

        return query.orderBy("createdAt", "desc").limit(input.limit);
      },
    });
  });

export const cancelJob = authedProcedure
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context, errors }) => {
    const { repos } = context;

    const job = await repos.job.findById(input.id);
    if (!job || job.userId !== context.user.id) {
      throw errors.NOT_FOUND();
    }

    // Can only cancel pending jobs
    if (job.status !== "pending") {
      throw errors.NOT_FOUND();
    }

    const updated = await repos.job.updateById({
      id: input.id,
      data: {
        status: "cancelled" as JobStatus,
        updatedAt: new Date(),
      },
    });

    return updated ?? null;
  });

export const exportTodos = authedProcedure.handler(async ({ context }) => {
  const { repos } = context;

  const job = await repos.job.createJob({
    userId: context.user.id,
    type: "export_todos",
    payload: { userId: context.user.id },
  });

  return job ?? null;
});
