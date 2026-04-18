import { defineTask } from "nitro/task";
import { z } from "zod";
import { runJobPollingTask } from "@/server/worker/polling-task";

const payloadSchema = z
  .object({
    concurrency: z.number().int().positive().optional(),
    pollIntervalMs: z.number().int().positive().optional(),
    maxRuntimeMs: z.number().int().positive().optional(),
    idleShutdownMs: z.number().int().positive().optional(),
    statusCheckMs: z.number().int().positive().optional(),
  })
  .partial();

export default defineTask({
  meta: {
    name: "poll-jobs",
    description:
      "Run the PostgreSQL job queue worker for a bounded amount of time and exit when idle.",
  },
  async run({ payload }) {
    const config = payloadSchema.parse(payload ?? {});
    const result = await runJobPollingTask(config);

    return {
      result,
    };
  },
});
