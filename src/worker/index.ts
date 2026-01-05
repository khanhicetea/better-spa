import { createRouterClient } from "@orpc/server";
import { CamelCasePlugin, Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import { createRepos } from "@/lib/db/repositories";
import type { Database } from "@/lib/db/schema";
import type { Job, JobStatus } from "@/lib/db/schema/job";
import { type JobType, workerRpc } from "./rpc";
import { DEFAULT_WORKER_CONFIG, type WorkerConfig } from "./types";

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
   * Claim the next pending job atomically using SELECT FOR UPDATE SKIP LOCKED.
   * Jobs are ordered by:
   * 1. Priority (DESC) - higher priority jobs are processed first
   * 2. Created time (ASC) - older jobs are processed first
   *
   * Only jobs where runAt <= now() are claimed (scheduled jobs support).
   */
  private async claimNextJob(): Promise<Job | undefined> {
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
   * Process a single job using oRPC handler
   */
  private async processJob(job: Job): Promise<void> {
    console.log(`Processing job ${job.id} (${job.type}): ${job.label}`);

    // Get handler module from worker RPC
    const handlerModule = workerRpc[job.type as JobType];
    if (!handlerModule) {
      await this.failJob(job.id, `Unknown job type: ${job.type}`);
      console.error(`Unknown job type: ${job.type}`);
      return;
    }

    try {
      // Create worker context
      const repos = createRepos(this.db);
      const rpcClient = createRouterClient(workerRpc, {
        context: async () => {
          return {
            db: this.db,
            repos,
            job,
            updateProgress: (progress: number) =>
              this.updateJobProgress(job.id, progress),
          };
        },
      });

      // Check if handler has a directly exported handler function
      const handlerFn = rpcClient[job.type as JobType];

      if (typeof handlerFn === "function") {
        // Call the exported handler function directly
        const result = await (handlerFn as any)(job.payload);
        // const result = await rpcClient.export_todos(job.payload)
        await this.completeJob(job.id, result);
        console.log(`Job ${job.id} completed successfully`);
      } else {
        console.log(`Job type ${job.type} not found`);
      }
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

export { workerProcedure } from "./base";
// Re-export helpers
export * from "./helpers";
export { type JobType, workerRpc } from "./rpc";
// Re-export types
export * from "./types";
