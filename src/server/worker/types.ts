/**
 * Worker types
 *
 * This file exports type-safe job types.
 * The types are inferred from the oRPC handler definitions,
 * providing a single source of truth for job payloads and results.
 */

import type { InferRouterInputs, InferRouterOutputs } from "@orpc/server";
import type { Job, JobStatus } from "@/server/db/schema/job";
import type { workerRpc } from "./rpc";

/**
 * All available job types (inferred from handlers)
 */
export type JobType = keyof typeof workerRpc;

/**
 * Router-level type inference (standard oRPC pattern)
 */
export type WorkerRouterInputs = InferRouterInputs<typeof workerRpc>;
export type WorkerRouterOutputs = InferRouterOutputs<typeof workerRpc>;

/**
 * Job payload type inferred from oRPC handler input schema
 *
 * Usage:
 * ```ts
 * type ExportTodosPayload = JobPayload<"export_todos">;
 * // => { userId: string }
 * ```
 */
export type JobPayload<T extends JobType> = WorkerRouterInputs[T];

/**
 * Job result type inferred from oRPC handler output
 *
 * Usage:
 * ```ts
 * type ExportTodosResult = JobResult<"export_todos">;
 * // => { exportedAt: string; categories: [...]; summary: {...} }
 * ```
 */
export type JobResult<T extends JobType> = WorkerRouterOutputs[T];

// Re-export for convenience
export type { JobType as WorkerJobType };

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

/**
 * Job with specific status type
 */
export type JobWithStatus<S extends JobStatus> = Job & { status: S };

/**
 * Type guard: Check if job is pending
 */
export function isPendingJob(job: Job): job is JobWithStatus<"pending"> {
  return job.status === "pending";
}

/**
 * Type guard: Check if job is processing
 */
export function isProcessingJob(job: Job): job is JobWithStatus<"processing"> {
  return job.status === "processing";
}

/**
 * Type guard: Check if job is completed
 */
export function isCompletedJob(job: Job): job is JobWithStatus<"completed"> {
  return job.status === "completed";
}

/**
 * Type guard: Check if job is failed
 */
export function isFailedJob(job: Job): job is JobWithStatus<"failed"> {
  return job.status === "failed";
}

/**
 * Type guard: Check if job is cancelled
 */
export function isCancelledJob(job: Job): job is JobWithStatus<"cancelled"> {
  return job.status === "cancelled";
}

/**
 * Type guard: Check if job is in a terminal state (completed, failed, or cancelled)
 */
export function isTerminalJob(
  job: Job,
): job is JobWithStatus<"completed" | "failed" | "cancelled"> {
  return ["completed", "failed", "cancelled"].includes(job.status);
}

/**
 * Type guard: Check if job is active (pending or processing)
 */
export function isActiveJob(
  job: Job,
): job is JobWithStatus<"pending" | "processing"> {
  return ["pending", "processing"].includes(job.status);
}
