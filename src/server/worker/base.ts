import { os } from "@orpc/server";
import type { DB } from "@/server/db/init";
import type { Repositories } from "@/server/db/repositories";
import type { Job, JobStatus } from "@/server/db/schema/job";

/**
 * Worker-specific base procedure
 *
 * Provides the worker context to all job handlers:
 * - db: Kysely database instance
 * - repos: Repository instances for data access
 * - job: The job record being processed
 * - updateProgress: Callback to update job progress (0-100)
 */
export const workerProcedure = os.$context<{
  db: DB;
  repos: Repositories;
  job: Job;
  updateProgress: ({
    progress,
    status,
  }: {
    progress?: number;
    status?: JobStatus;
  }) => Promise<void>;
}>();
