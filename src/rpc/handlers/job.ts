import { pickBy } from "lodash-es";
import { z } from "zod";
import type { JobStatus } from "@/lib/db/schema/job";
import { generateUUID } from "@/lib/helpers/data";
import { adminProcedure, authedProcedure } from "../base";

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
      id: generateUUID(),
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

export const listAllJobs = adminProcedure
  .input(
    z.object({
      status: jobStatusSchema.optional(),
      limit: z.number().int().min(1).max(100).default(20),
    }),
  )
  .handler(async ({ input, context }) => {
    const { repos } = context;
    const { limit, ...filter } = input;

    const jobs = await repos.job.find({
      where: {
        ...pickBy(filter, (v) => v !== undefined),
      },
      modify: (qb) => qb.orderBy("createdAt", "desc").limit(limit),
    });

    return jobs;
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
    const { limit, ...filter } = input;

    const jobs = await repos.job.find({
      where: {
        userId: context.user.id,
        ...pickBy(filter, (v) => v !== undefined),
      },
      modify: (qb) => qb.orderBy("createdAt", "desc").limit(limit),
    });

    return jobs;
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
