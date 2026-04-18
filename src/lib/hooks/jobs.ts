import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import type { Job, JobStatus } from "@/server/db/schema/job";
import { orpc } from "@/lib/orpc";
import {
  getJobsRefetchInterval,
  getSingleJobRefetchInterval,
  isTerminalJobStatus,
} from "@/lib/jobs/status";
import type { JobPayload, JobResult, JobType } from "@/server/worker/types";

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

export function useUserJobs(options: UseUserJobsOptions = {}) {
  const { jobId, status, limit = 20, enabled = true } = options;

  return useQuery({
    ...orpc.job.list.queryOptions({
      input: {
        jobId,
        status,
        limit,
      },
    }),
    enabled,
    refetchInterval: (query) => getJobsRefetchInterval(query.state.data),
    refetchIntervalInBackground: false,
  });
}

export function useJob<T extends JobType = JobType>(
  jobId: string,
  enabled = true,
) {
  const query = useQuery({
    ...orpc.job.get.queryOptions({
      input: { id: jobId },
    }),
    enabled: enabled && !!jobId,
    refetchInterval: (query) => getSingleJobRefetchInterval(query.state.data),
    refetchIntervalInBackground: false,
  });

  return {
    ...query,
    data: query.data as TypedJob<T> | undefined,
  };
}

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
  const { data: job } = useJob<T>(jobId, enabled);
  const previousStatusRef = useRef<JobStatus | undefined>(undefined);
  const previousProgressRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!job) return;

    const statusChanged = previousStatusRef.current !== job.status;
    const progressChanged = previousProgressRef.current !== job.progress;

    if (statusChanged || progressChanged) {
      onChange?.(job);
    }

    if (statusChanged && isTerminalJobStatus(job.status)) {
      if (job.status === "completed") {
        onSuccess?.(job);
      } else if (job.status === "failed") {
        onFailed?.(job);
      } else if (job.status === "cancelled") {
        onCancel?.(job);
      }

      onSettled?.(job);
    }

    previousStatusRef.current = job.status;
    previousProgressRef.current = job.progress;
  }, [job, onCancel, onChange, onFailed, onSettled, onSuccess]);

  return job;
}
