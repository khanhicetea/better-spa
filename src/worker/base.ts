import { os } from "@orpc/server";
import type { DB } from "@/lib/db/init";
import type { Repositories } from "@/lib/db/repositories";
import type { Job } from "@/lib/db/schema/job";

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
  updateProgress: (progress: number) => Promise<void>;
}>();
