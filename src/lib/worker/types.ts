import type { Kysely } from "kysely";
import type { Database } from "@/lib/db/schema";
import type { Job } from "@/lib/db/schema/job";

/**
 * Job type keys - extend this union type when adding new job types
 */
export type JobType = "export_todos";

/**
 * Payload types for each job type
 */
export interface JobPayloads {
  export_todos: {
    userId: string;
  };
}

/**
 * Result types for each job type
 */
export interface JobResults {
  export_todos: {
    exportedAt: string;
    categories: {
      id: string;
      name: string;
      createdAt: Date;
      items: {
        id: string;
        content: string;
        completedAt: Date | null;
        createdAt: Date;
      }[];
    }[];
    summary: {
      totalCategories: number;
      totalItems: number;
      completedItems: number;
    };
  };
}

/**
 * Progress update callback
 */
export type ProgressCallback = (progress: number) => Promise<void>;

/**
 * Job handler context
 */
export interface JobHandlerContext {
  db: Kysely<Database>;
  job: Job;
  updateProgress: ProgressCallback;
}

/**
 * Job handler function type
 */
export type JobHandler<T extends JobType = JobType> = (
  context: JobHandlerContext,
) => Promise<JobResults[T]>;

/**
 * Registry of all job handlers
 */
export type JobHandlerRegistry = {
  [K in JobType]: JobHandler<K>;
};

/**
 * Worker configuration
 */
export interface WorkerConfig {
  pollIntervalMs: number;
  staleCheckIntervalMs: number;
  staleThresholdMinutes: number;
}

export const DEFAULT_WORKER_CONFIG: WorkerConfig = {
  pollIntervalMs: 2000,
  staleCheckIntervalMs: 60000,
  staleThresholdMinutes: 5,
};
