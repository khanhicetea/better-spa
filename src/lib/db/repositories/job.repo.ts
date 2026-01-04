import type { DB } from "../init";
import type { JobStatus } from "../schema/job";
import type { JobPayloads, JobType } from "@/lib/worker/types";
import { Repository } from "./base";

export interface CreateJobOptions<T extends JobType> {
  userId: string;
  type: T;
  payload: JobPayloads[T];
  label?: string;
  maxRetries?: number;
}

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
   */
  async createJob<T extends JobType>(options: CreateJobOptions<T>) {
    const { userId, type, payload, label, maxRetries = 3 } = options;
    const now = new Date();

    return this.insertReturn({
      id: crypto.randomUUID(),
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
      startedAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Find the next pending job and atomically mark it as processing.
   * Uses SELECT FOR UPDATE SKIP LOCKED for concurrent worker safety.
   */
  async claimNextPendingJob() {
    const result = await this.db
      .updateTable("job")
      .set({
        status: "processing" as JobStatus,
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where("id", "=", (eb) =>
        eb
          .selectFrom("job")
          .select("id")
          .where("status", "=", "pending")
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
}
