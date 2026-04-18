import { generateUUID } from "@/lib/helpers/data";
import type { JobPayload, JobResult, JobType } from "@/server/worker/types";
import { sql } from "kysely";
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
   * Helper to normalize job record from DB.
   * Ensures payload and result are objects, even if stored as JSON strings.
   */
  normalizeJobRecord<T extends JobType>(
    job: Job,
  ): Job & { payload: JobPayload<T>; result: JobResult<T> | null } {
    const payload =
      typeof job.payload === "string" ? JSON.parse(job.payload) : job.payload;
    const result =
      typeof job.result === "string" ? JSON.parse(job.result) : job.result;

    return {
      ...job,
      payload: payload as JobPayload<T>,
      result: result as JobResult<T> | null,
    };
  }

  /**
   * Create a new job with sensible defaults.
   */
  async createJob<T extends JobType>(options: {
    id?: string;
    userId: string;
    type: T;
    payload: JobPayload<T>;
    label?: string;
    maxRetries?: number;
    priority?: JobPriority | number;
    runAt?: Date;
  }) {
    const {
      id,
      userId,
      type,
      payload,
      label,
      maxRetries = 3,
      priority = JobPriority.NORMAL,
      runAt,
    } = options;
    const now = new Date();

    const record = await this.insertReturn({
      id: id || generateUUID(),
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
      leaseOwner: null,
      leaseExpiresAt: null,
      startedAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    if (!record) {
      throw new Error("Failed to create job");
    }

    return this.normalizeJobRecord<T>(record);
  }

  /**
   * Claim the next runnable job for a worker.
   * Uses SELECT FOR UPDATE SKIP LOCKED for multi-worker safety.
   */
  async claimNextRunnableJob(workerId: string, leaseExpiresAt: Date) {
    const now = new Date();
    const record = await this.db
      .updateTable("job")
      .set({
        status: "processing" as JobStatus,
        leaseOwner: workerId,
        leaseExpiresAt,
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

    return record ? this.normalizeJobRecord(record) : undefined;
  }

  /**
   * Renew the lease for a job currently owned by the worker.
   */
  async renewLease(jobId: string, workerId: string, leaseExpiresAt: Date) {
    const result = await this.db
      .updateTable("job")
      .set({
        leaseExpiresAt,
        updatedAt: new Date(),
      })
      .where("id", "=", jobId)
      .where("leaseOwner", "=", workerId)
      .where("status", "=", "processing")
      .executeTakeFirst();

    return result.numUpdatedRows > 0n;
  }

  /**
   * Complete a job owned by the worker.
   */
  async completeOwnedJob(jobId: string, workerId: string, result: unknown) {
    const now = new Date();
    const updated = await this.db
      .updateTable("job")
      .set({
        status: "completed" as JobStatus,
        progress: 100,
        result: JSON.stringify(result),
        completedAt: now,
        updatedAt: now,
        leaseOwner: null,
        leaseExpiresAt: null,
      })
      .where("id", "=", jobId)
      .where("leaseOwner", "=", workerId)
      .returningAll()
      .executeTakeFirst();

    return updated ? this.normalizeJobRecord(updated) : undefined;
  }

  /**
   * Fail or reschedule a job owned by the worker.
   */
  async retryOrFailOwnedJob(
    jobId: string,
    workerId: string,
    error: string,
    retryable: boolean,
  ) {
    const now = new Date();

    // First get the job to check retry count
    const job = await this.db
      .selectFrom("job")
      .select(["retryCount", "maxRetries"])
      .where("id", "=", jobId)
      .where("leaseOwner", "=", workerId)
      .executeTakeFirst();

    if (!job) return undefined;

    const willRetry = retryable && job.retryCount + 1 < job.maxRetries;

    if (willRetry) {
      // Exponential backoff: min(30s * 2^retryCount, 15m)
      const delaySec = Math.min(30 * 2 ** job.retryCount, 15 * 60);
      const runAt = new Date(now.getTime() + delaySec * 1000);

      const updated = await this.db
        .updateTable("job")
        .set({
          status: "pending" as JobStatus,
          retryCount: job.retryCount + 1,
          error,
          runAt,
          startedAt: null,
          leaseOwner: null,
          leaseExpiresAt: null,
          updatedAt: now,
        })
        .where("id", "=", jobId)
        .where("leaseOwner", "=", workerId)
        .returningAll()
        .executeTakeFirst();

      return updated ? this.normalizeJobRecord(updated) : undefined;
    }

    // Final failure
    const updated = await this.db
      .updateTable("job")
      .set({
        status: "failed" as JobStatus,
        retryCount: job.retryCount + 1,
        error,
        completedAt: now,
        updatedAt: now,
        leaseOwner: null,
        leaseExpiresAt: null,
      })
      .where("id", "=", jobId)
      .where("leaseOwner", "=", workerId)
      .returningAll()
      .executeTakeFirst();

    return updated ? this.normalizeJobRecord(updated) : undefined;
  }

  /**
   * Recover jobs with expired leases.
   */
  async recoverExpiredLeases(now: Date) {
    const expiredJobs = await this.db
      .selectFrom("job")
      .selectAll()
      .where("status", "=", "processing")
      .where("leaseExpiresAt", "<", now)
      .execute();

    const results = [];
    for (const job of expiredJobs) {
      // Treat expired lease as a retryable failure
      const recovered = await this.db
        .updateTable("job")
        // We use a simplified retry logic here because we don't "own" it via workerId anymore
        .set((eb) => {
          const willRetry = job.retryCount + 1 < job.maxRetries;
          if (willRetry) {
            const delaySec = Math.min(30 * 2 ** job.retryCount, 15 * 60);
            return {
              status: "pending" as JobStatus,
              retryCount: eb("retryCount", "+", 1),
              error: "Worker lease expired",
              runAt: new Date(now.getTime() + delaySec * 1000),
              startedAt: null,
              leaseOwner: null,
              leaseExpiresAt: null,
              updatedAt: now,
            };
          }
          return {
            status: "failed" as JobStatus,
            retryCount: eb("retryCount", "+", 1),
            error: "Worker lease expired",
            completedAt: now,
            updatedAt: now,
            leaseOwner: null,
            leaseExpiresAt: null,
          };
        })
        .where("id", "=", job.id)
        .where("status", "=", "processing")
        .where("leaseExpiresAt", "=", job.leaseExpiresAt) // Optimistic concurrency
        .returningAll()
        .executeTakeFirst();

      if (recovered) {
        results.push(this.normalizeJobRecord(recovered));
      }
    }
    return results;
  }

  /**
   * Find jobs for a specific user.
   */
  async findUserJobs(filters: {
    userId: string;
    id?: string;
    status?: JobStatus;
    limit?: number;
  }) {
    let query = this.db
      .selectFrom("job")
      .selectAll()
      .where("userId", "=", filters.userId);

    if (filters.id) {
      query = query.where("id", "=", filters.id);
    }

    if (filters.status) {
      query = query.where("status", "=", filters.status);
    }

    const records = await query
      .orderBy("createdAt", "desc")
      .limit(filters.limit ?? 50)
      .execute();

    return records.map((r) => this.normalizeJobRecord(r));
  }

  /**
   * Find jobs for admin view.
   */
  async findAdminJobs(filters: {
    userId?: string;
    type?: string;
    status?: JobStatus;
    limit?: number;
  }) {
    let query = this.db.selectFrom("job").selectAll();

    if (filters.userId) {
      query = query.where("userId", "=", filters.userId);
    }

    if (filters.type) {
      query = query.where("type", "=", filters.type);
    }

    if (filters.status) {
      query = query.where("status", "=", filters.status);
    }

    const records = await query
      .orderBy("createdAt", "desc")
      .limit(filters.limit ?? 100)
      .execute();

    return records.map((r) => this.normalizeJobRecord(r));
  }

  /**
   * Find a job by ID with visibility checks.
   */
  async findVisibleJobById(params: {
    id: string;
    requesterUserId: string;
    isAdmin: boolean;
  }) {
    let query = this.db
      .selectFrom("job")
      .selectAll()
      .where("id", "=", params.id);

    if (!params.isAdmin) {
      query = query.where("userId", "=", params.requesterUserId);
    }

    const record = await query.executeTakeFirst();
    return record ? this.normalizeJobRecord(record) : undefined;
  }

  /**
   * Cancel a pending job.
   */
  async cancelPendingJob(params: {
    id: string;
    requesterUserId: string;
    isAdmin: boolean;
  }) {
    let query = this.db
      .updateTable("job")
      .set({
        status: "cancelled" as JobStatus,
        updatedAt: new Date(),
      })
      .where("id", "=", params.id)
      .where("status", "=", "pending");

    if (!params.isAdmin) {
      query = query.where("userId", "=", params.requesterUserId);
    }

    const updated = await query.returningAll().executeTakeFirst();
    return updated ? this.normalizeJobRecord(updated) : undefined;
  }

  /**
   * Update job progress (0-100)
   */
  async updateJobProgress(
    jobId: string,
    workerId: string,
    updates: { progress?: number; status?: JobStatus },
  ): Promise<void> {
    await this.db
      .updateTable("job")
      .set({
        progress: updates.progress,
        status: updates.status,
        updatedAt: new Date(),
      })
      .where("id", "=", jobId)
      .where("leaseOwner", "=", workerId)
      .execute();
  }

  /**
   * Legacy method for backward compatibility if needed, but preferred to use completeOwnedJob
   */
  async completeJob(jobId: string, result: unknown): Promise<void> {
    await this.db
      .updateTable("job")
      .set({
        status: "completed" as JobStatus,
        progress: 100,
        result: JSON.stringify(result),
        completedAt: new Date(),
        updatedAt: new Date(),
        leaseOwner: null,
        leaseExpiresAt: null,
      })
      .where("id", "=", jobId)
      .execute();
  }

  /**
   * Legacy method for backward compatibility
   */
  async failJob(jobId: string, error: string): Promise<void> {
    await this.db
      .updateTable("job")
      .set((eb) => ({
        status: "failed" as JobStatus,
        error,
        retryCount: eb("retryCount", "+", 1),
        updatedAt: new Date(),
        leaseOwner: null,
        leaseExpiresAt: null,
      }))
      .where("id", "=", jobId)
      .execute();
  }
}
