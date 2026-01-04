import { CamelCasePlugin, Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import type { Database } from "@/lib/db/schema";
import type { Job, JobStatus } from "@/lib/db/schema/job";
import { jobHandlers } from "./handlers";
import {
  DEFAULT_WORKER_CONFIG,
  type JobType,
  type WorkerConfig,
} from "./types";

const { Pool } = pg;

export class Worker {
  private db: Kysely<Database>;
  private config: WorkerConfig;
  private isShuttingDown = false;
  private lastStaleCheck = 0;

  constructor(connectionString: string, config: Partial<WorkerConfig> = {}) {
    this.config = { ...DEFAULT_WORKER_CONFIG, ...config };
    this.db = new Kysely<Database>({
      dialect: new PostgresDialect({
        pool: new Pool({
          connectionString,
          max: 2,
        }),
      }),
      plugins: [new CamelCasePlugin()],
    });
  }

  /**
   * Claim the next pending job atomically using SELECT FOR UPDATE SKIP LOCKED
   */
  private async claimNextJob(): Promise<Job | undefined> {
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

    return result as Job | undefined;
  }

  /**
   * Update job progress
   */
  private async updateJobProgress(
    jobId: string,
    progress: number,
  ): Promise<void> {
    await this.db
      .updateTable("job")
      .set({
        progress,
        updatedAt: new Date(),
      })
      .where("id", "=", jobId)
      .execute();
  }

  /**
   * Mark job as completed with result
   */
  private async completeJob(jobId: string, result: unknown): Promise<void> {
    await this.db
      .updateTable("job")
      .set({
        status: "completed" as JobStatus,
        progress: 100,
        result: JSON.stringify(result),
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where("id", "=", jobId)
      .execute();
  }

  /**
   * Mark job as failed
   */
  private async failJob(jobId: string, error: string): Promise<void> {
    await this.db
      .updateTable("job")
      .set((eb) => ({
        status: "failed" as JobStatus,
        error,
        retryCount: eb("retryCount", "+", 1),
        updatedAt: new Date(),
      }))
      .where("id", "=", jobId)
      .execute();
  }

  /**
   * Process a single job
   */
  private async processJob(job: Job): Promise<void> {
    console.log(`Processing job ${job.id} (${job.type}): ${job.label}`);

    const handler = jobHandlers[job.type as JobType];
    if (!handler) {
      await this.failJob(job.id, `Unknown job type: ${job.type}`);
      console.error(`Unknown job type: ${job.type}`);
      return;
    }

    try {
      const result = await handler({
        db: this.db,
        job,
        updateProgress: (progress) => this.updateJobProgress(job.id, progress),
      });
      await this.completeJob(job.id, result);
      console.log(`Job ${job.id} completed successfully`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.failJob(job.id, errorMessage);
      console.error(`Job ${job.id} failed:`, errorMessage);
    }
  }

  /**
   * Mark stale processing jobs as failed
   */
  private async markStaleJobs(): Promise<void> {
    const threshold = new Date(
      Date.now() - this.config.staleThresholdMinutes * 60 * 1000,
    );

    const result = await this.db
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

    if (result.length > 0) {
      console.log(`Marked ${result.length} stale job(s) as failed`);
    }
  }

  /**
   * Requeue failed jobs that have retries remaining
   */
  private async requeueFailedJobs(): Promise<void> {
    const result = await this.db
      .updateTable("job")
      .set({
        status: "pending" as JobStatus,
        error: null,
        updatedAt: new Date(),
      })
      .where("status", "=", "failed")
      .where((eb) => eb("retryCount", "<", eb.ref("maxRetries")))
      .returningAll()
      .execute();

    if (result.length > 0) {
      console.log(`Requeued ${result.length} failed job(s) for retry`);
    }
  }

  /**
   * Single poll iteration
   */
  private async poll(): Promise<void> {
    if (this.isShuttingDown) return;

    try {
      const now = Date.now();
      if (now - this.lastStaleCheck > this.config.staleCheckIntervalMs) {
        await this.markStaleJobs();
        await this.requeueFailedJobs();
        this.lastStaleCheck = now;
      }

      const job = await this.claimNextJob();
      if (job) {
        await this.processJob(job);
      }
    } catch (error) {
      console.error("Worker error:", error);
    }

    if (!this.isShuttingDown) {
      setTimeout(() => this.poll(), this.config.pollIntervalMs);
    }
  }

  /**
   * Start the worker
   */
  start(): void {
    console.log("Starting job worker...");
    this.poll();
  }

  /**
   * Gracefully shutdown the worker
   */
  async shutdown(): Promise<void> {
    console.log("Shutting down worker...");
    this.isShuttingDown = true;
    await this.db.destroy();
  }
}

// Re-export types
export * from "./types";
export { jobHandlers } from "./handlers";
