import type { DB } from "../init";
import type { JobStatus } from "../schema/job";
import { Repository } from "./base";

export class JobRepository extends Repository<"job"> {
  constructor(db: DB) {
    super(db, "job");
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
