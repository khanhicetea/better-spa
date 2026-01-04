/**
 * Worker types
 *
 * This file exports type-safe job types.
 * The types are inferred from the oRPC handler definitions,
 * providing a single source of truth for job payloads and results.
 */

import type { InferRouterInputs, InferRouterOutputs } from "@orpc/server";
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
