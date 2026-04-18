import type { Job, JobStatus } from "@/server/db/schema/job";

export const ACTIVE_JOB_STATUSES: JobStatus[] = ["pending", "processing"];
export const TERMINAL_JOB_STATUSES: JobStatus[] = [
  "completed",
  "failed",
  "cancelled",
];

export const JOB_POLLING_INTERVALS = {
  activeMs: 1000,
  idleMs: 5000,
} as const;

export function isActiveJobStatus(status: JobStatus) {
  return ACTIVE_JOB_STATUSES.includes(status);
}

export function isTerminalJobStatus(status: JobStatus) {
  return TERMINAL_JOB_STATUSES.includes(status);
}

export function hasActiveJobs(
  jobs: Array<Pick<Job, "status">> | null | undefined,
) {
  if (!jobs || jobs.length === 0) return false;
  return jobs.some((job) => isActiveJobStatus(job.status));
}

export function getJobsRefetchInterval(
  jobs: Array<Pick<Job, "status">> | null | undefined,
) {
  return hasActiveJobs(jobs)
    ? JOB_POLLING_INTERVALS.activeMs
    : JOB_POLLING_INTERVALS.idleMs;
}

export function getSingleJobRefetchInterval(
  job: Pick<Job, "status"> | undefined,
) {
  if (!job) return JOB_POLLING_INTERVALS.activeMs;
  return isTerminalJobStatus(job.status)
    ? false
    : JOB_POLLING_INTERVALS.activeMs;
}
