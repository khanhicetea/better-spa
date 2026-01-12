/**
 * Job creation helpers
 *
 * This file provides utility functions to simplify job creation
 * with full type inference from oRPC handlers.
 */

import type { Repositories } from "@/server/db/repositories";
import type { JobPriority } from "@/server/db/schema/job";
import type { JobPayload, JobType } from "./types";

/**
 * Options for job creation (excluding type and payload which are inferred)
 */
export interface JobCreationOptions {
  label?: string;
  maxRetries?: number;
  priority?: JobPriority | number;
  runAt?: Date;
}

/**
 * Create a job factory function for a specific job type.
 * The factory function will have full type inference for the payload.
 *
 * @example
 * ```ts
 * // Create factory for export_todos job
 * const createExportJob = createJobFactory("export_todos", "Export Todos");
 *
 * // Usage in RPC handler - payload is fully typed!
 * export const exportTodos = authedProcedure.handler(async ({ context }) => {
 *   return createExportJob(
 *     context.repos,
 *     context.user.id,
 *     { userId: context.user.id }  // ✅ Type-checked against handler input
 *   );
 * });
 * ```
 */
export function createJobFactory<T extends JobType>(
  type: T,
  defaultLabel?: string,
) {
  return (
    repos: Repositories,
    userId: string,
    payload: JobPayload<T>,
    options?: JobCreationOptions,
  ) => {
    return repos.job.createJob({
      userId,
      type,
      payload,
      label: options?.label ?? defaultLabel,
      maxRetries: options?.maxRetries,
      priority: options?.priority,
      runAt: options?.runAt,
    });
  };
}

/**
 * Create a scheduled job factory function for a specific job type.
 * The factory function will have full type inference and always require a runAt date.
 *
 * @example
 * ```ts
 * // Create factory for scheduled exports
 * const scheduleExportJob = createScheduledJobFactory("export_todos", "Scheduled Export");
 *
 * // Usage - must provide runAt
 * const job = await scheduleExportJob(
 *   repos,
 *   userId,
 *   { userId },
 *   new Date(Date.now() + 5 * 60 * 1000)  // Run in 5 minutes
 * );
 * ```
 */
export function createScheduledJobFactory<T extends JobType>(
  type: T,
  defaultLabel?: string,
) {
  return (
    repos: Repositories,
    userId: string,
    payload: JobPayload<T>,
    runAt: Date,
    options?: Omit<JobCreationOptions, "runAt">,
  ) => {
    return repos.job.createJob({
      userId,
      type,
      payload,
      label: options?.label ?? defaultLabel,
      maxRetries: options?.maxRetries,
      priority: options?.priority,
      runAt,
    });
  };
}

/**
 * Create a priority job factory function for a specific job type.
 * The factory function will have full type inference and always require a priority level.
 *
 * @example
 * ```ts
 * // Create factory for priority exports
 * const createPriorityExportJob = createPriorityJobFactory("export_todos", "Priority Export");
 *
 * // Usage - must provide priority
 * const job = await createPriorityExportJob(
 *   repos,
 *   userId,
 *   { userId },
 *   JobPriority.URGENT
 * );
 * ```
 */
export function createPriorityJobFactory<T extends JobType>(
  type: T,
  defaultLabel?: string,
) {
  return (
    repos: Repositories,
    userId: string,
    payload: JobPayload<T>,
    priority: JobPriority | number,
    options?: Omit<JobCreationOptions, "priority">,
  ) => {
    return repos.job.createJob({
      userId,
      type,
      payload,
      label: options?.label ?? defaultLabel,
      maxRetries: options?.maxRetries,
      priority,
      runAt: options?.runAt,
    });
  };
}
