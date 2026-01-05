import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import type { JobStatus, Job } from "@/lib/db/schema/job";
import type { JobType, JobPayload, JobResult } from "@/worker/types";
import { useEffect } from "react";

/**
 * Typed job with specific payload and result types
 */
export type TypedJob<T extends JobType> = Omit<Job, "payload" | "result"> & {
  payload: JobPayload<T> | null;
  result: JobResult<T> | null;
};

export const JOB_QUERY_KEYS = {
  userJobs: (filter?: { jobId?: string; status?: JobStatus }) =>
    ["jobs", "user", filter] as const,
  singleJob: (jobId: string) => ["jobs", "single", jobId] as const,
} as const;

interface UseUserJobsOptions {
  jobId?: string;
  status?: JobStatus;
  limit?: number;
  enabled?: boolean;
}

/**
 * Hook to subscribe to user jobs with 1-second polling.
 * Automatically stops polling when all jobs are in terminal states.
 */
export function useUserJobs(options: UseUserJobsOptions = {}) {
  const { jobId, status, limit = 20, enabled = true } = options;

  const query = useQuery({
    ...orpc.job.listJobs.queryOptions({
      input: {
        jobId,
        status,
        limit,
      },
    }),
    enabled,
    refetchInterval: (query) => {
      // Stop polling if all jobs are in terminal states
      const jobs = query.state.data;
      if (!jobs || jobs.length === 0) return 1000;

      const hasActiveJobs = jobs.some(
        (job) => job.status === "pending" || job.status === "processing",
      );

      return hasActiveJobs ? 1000 : 5000;
    },
    refetchIntervalInBackground: false,
  });

  return query;
}

/**
 * Hook to subscribe to a single job with 1-second polling.
 * Accepts a generic type parameter for type-safe payload and result access.
 *
 * @example
 * ```tsx
 * const { data: job } = useJob<"export_todos">(jobId);
 * if (job?.result) {
 *   job.result.summary.totalItems;  // ✅ Fully typed!
 * }
 * if (job?.payload) {
 *   job.payload.userId;  // ✅ Fully typed!
 * }
 * ```
 */
export function useJob<T extends JobType = JobType>(
  jobId: string,
  enabled = true,
) {
  const query = useQuery({
    ...orpc.job.getJob.queryOptions({
      input: { id: jobId },
    }),
    enabled: enabled && !!jobId,
    refetchInterval: (query) => {
      const job = query.state.data;
      if (!job) return 1000;

      // Stop polling when job is complete/failed/cancelled
      const isTerminal = ["completed", "failed", "cancelled"].includes(
        job.status,
      );
      return isTerminal ? false : 1000;
    },
    refetchIntervalInBackground: false,
  });

  return {
    ...query,
    data: query.data as TypedJob<T> | undefined,
  };
}

/**
 * Hook to listen to job status changes with event callbacks.
 * Accepts a generic type parameter for type-safe payload and result access.
 *
 * @example
 * ```tsx
 * useListenJob<"export_todos">({
 *   jobId: exportJobId,
 *   onChange: (job) => setProgress(job.progress),
 *   onSuccess: (job) => {
 *     // job.result is fully typed!
 *     console.log(job.result?.summary.totalItems);
 *   },
 * });
 * ```
 */
export function useListenJob<T extends JobType = JobType>({
  jobId,
  enabled = true,
  onChange,
  onSuccess,
  onFailed,
  onCancel,
  onSettled,
}: {
  jobId: string;
  enabled?: boolean;
  onChange?: (job: TypedJob<T>) => void;
  onSuccess?: (job: TypedJob<T>) => void;
  onFailed?: (job: TypedJob<T>) => void;
  onCancel?: (job: TypedJob<T>) => void;
  onSettled?: (job: TypedJob<T>) => void;
}) {
  const query = useJob<T>(jobId, enabled);
  const job = query.data;

  useEffect(() => {
    if (!job) return;

    // Call onChange for any status change
    onChange?.(job);

    // Call specific callbacks based on terminal states
    if (job.status === "completed") {
      onSuccess?.(job);
      onSettled?.(job);
    } else if (job.status === "failed") {
      onFailed?.(job);
      onSettled?.(job);
    } else if (job.status === "cancelled") {
      onCancel?.(job);
      onSettled?.(job);
    }
  }, [job?.status, job?.progress]);

  return query;
}
