import type { JobPayload, JobResult, JobType } from "@/worker/types";
import { generateUUID } from "@/lib/data";
import type { DB } from "../init";
import type { Job, JobStatus } from "../schema/job";
import { JobPriority } from "../schema/job";
import { Repository } from "./base";

const DEFAULT_JOB_LABELS: Record<JobType, string> = {
  export_todos: "Export Todos to JSON",
};

export class JobRepository extends Repository<"job"> {
  constructor(db: DB) {
    super(db, "job");
  }

  /**
   * Create a new job with sensible defaults.
   * Only userId, type, and payload are required.
   *
   * @example
   * ```ts
   * // Generic type is inferred from `type` field - no need to specify it!
   * const job = await repos.job.createJob({
   *   userId: context.user.id,
   *   type: "export_todos",
   *   payload: { userId: context.user.id },
   * });
   *
   * // Schedule job to run in 5 minutes
   * const scheduledJob = await repos.job.createJob({
   *   userId: context.user.id,
   *   type: "export_todos",
   *   payload: { userId: context.user.id },
   *   runAt: new Date(Date.now() + 5 * 60 * 1000),
   * });
   *
   * // Create high priority job
   * const urgentJob = await repos.job.createJob({
   *   userId: context.user.id,
   *   type: "export_todos",
   *   payload: { userId: context.user.id },
   *   priority: JobPriority.URGENT,
   * });
   * ```
   */
  async createJob<T extends JobType>(options: {
    userId: string;
    type: T;
    payload: JobPayload<T>;
    label?: string;
    maxRetries?: number;
    priority?: JobPriority | number;
    runAt?: Date;
  }) {
    const {
      userId,
      type,
      payload,
      label,
      maxRetries = 3,
      priority = JobPriority.NORMAL,
      runAt,
    } = options;
    const now = new Date();

    return this.insertReturn({
      id: generateUUID(),
      userId,
      type,
      label: label ?? DEFAULT_JOB_LABELS[type] ?? type,
      status: "pending" as JobStatus,
      progress: 0,
      payload,
      result: null,
      error: null,
      retryCount: 0,
      maxRetries,
      priority,
      runAt: runAt ?? now,
      startedAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Find the next pending job and atomically mark it as processing.
   * Uses SELECT FOR UPDATE SKIP LOCKED for concurrent worker safety.
   * Jobs are ordered by priority (DESC) then created time (ASC).
   * Only jobs where runAt <= now() are claimed (scheduled jobs support).
   */
  async claimNextPendingJob() {
    const now = new Date();
    const result = await this.db
      .updateTable("job")
      .set({
        status: "processing" as JobStatus,
        startedAt: now,
        updatedAt: now,
      })
      .where("id", "=", (eb) =>
        eb
          .selectFrom("job")
          .select("id")
          .where("status", "=", "pending")
          .where("runAt", "<=", now)
          .orderBy("priority", "desc")
          .orderBy("createdAt", "asc")
          .limit(1)
          .forUpdate()
          .skipLocked(),
      )
      .returningAll()
      .executeTakeFirst();

    return result;
  }

  /**
   * Find jobs eligible for retry (failed jobs with retryCount < maxRetries).
   * Resets them to pending status.
   */
  async requeueFailedJobs() {
    const now = new Date();
    return this.db
      .updateTable("job")
      .set({
        status: "pending" as JobStatus,
        error: null,
        updatedAt: now,
      })
      .where("status", "=", "failed")
      .where((eb) => eb("retryCount", "<", eb.ref("maxRetries")))
      .returningAll()
      .execute();
  }

  /**
   * Mark stale processing jobs (stuck for > threshold minutes) as failed for retry.
   */
  async markStaleJobsAsFailed(staleThresholdMinutes = 5) {
    const threshold = new Date(Date.now() - staleThresholdMinutes * 60 * 1000);
    return this.db
      .updateTable("job")
      .set({
        status: "failed" as JobStatus,
        error: "Job timed out",
        updatedAt: new Date(),
      })
      .where("status", "=", "processing")
      .where("startedAt", "<", threshold)
      .returningAll()
      .execute();
  }

  /**
   * Get a job with type-safe result accessor.
   * The result field is automatically typed based on the job type.
   *
   * @example
   * ```ts
   * const job = await repos.job.getJobWithResult<"export_todos">(jobId);
   * if (job?.result) {
   *   // ✅ result is typed as JobResult<"export_todos">
   *   console.log(job.result.summary.totalItems);
   * }
   * ```
   */
  async getJobWithResult<T extends JobType>(
    jobId: string,
  ): Promise<(Job & { result: JobResult<T> | null }) | undefined> {
    const job = await this.findById(jobId);
    if (!job) return undefined;

    // Parse JSON result if it's a string (stored as JSONB in DB)
    const result =
      typeof job.result === "string" ? JSON.parse(job.result) : job.result;

    return { ...job, result: result as JobResult<T> | null };
  }

  /**
   * Get a job with type-safe result accessor, or throw if not found.
   *
   * @example
   * ```ts
   * const job = await repos.job.getJobWithResultOrFail<"export_todos">(jobId);
   * // ✅ job is guaranteed to exist, result is typed
   * if (job.result) {
   *   console.log(job.result.summary.totalItems);
   * }
   * ```
   */
  async getJobWithResultOrFail<T extends JobType>(
    jobId: string,
  ): Promise<Job & { result: JobResult<T> | null }> {
    const job = await this.getJobWithResult<T>(jobId);
    if (!job) {
      throw new Error(`Job with id ${jobId} not found`);
    }
    return job;
  }
}
