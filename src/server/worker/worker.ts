import { createRouterClient } from "@orpc/server";
import type { DB } from "@/server/db/init";
import type { Repositories } from "@/server/db/repositories";
import type { Job, JobStatus } from "@/server/db/schema/job";
import { logger } from "@/server/logger";
import { type JobType, workerRpc } from "./rpc";
import { DEFAULT_WORKER_CONFIG, type WorkerConfig } from "./types";

export class Worker {
  private db: DB;
  private repos: Repositories;
  private config: WorkerConfig;
  private isShuttingDown = false;
  private lastStaleCheck = 0;

  constructor(db: DB, repos: Repositories, config: Partial<WorkerConfig> = {}) {
    this.db = db;
    this.repos = repos;
    this.config = { ...DEFAULT_WORKER_CONFIG, ...config };
  }

  /**
   * Process a single job using oRPC handler
   */
  async processJob(job: Job): Promise<void> {
    logger.info("Processing worker job", {
      id: job.id,
      type: job.type,
      label: job.label,
    });

    // Get handler module from worker RPC
    const handlerModule = workerRpc[job.type as JobType];
    if (!handlerModule) {
      await this.repos.job.failJob(job.id, `Unknown job type: ${job.type}`);
      logger.error("Unknown worker job type", {
        type: job.type,
        jobId: job.id,
      });
      return;
    }

    try {
      const rpcClient = createRouterClient(workerRpc, {
        context: async () => {
          return {
            db: this.db,
            repos: this.repos,
            job,
            updateProgress: ({
              progress,
              status,
            }: {
              progress?: number;
              status?: JobStatus;
            }) =>
              this.repos.job.updateJobProgress(job.id, { progress, status }),
          };
        },
      });

      // Check if handler has a directly exported handler function
      const handlerFn = rpcClient[job.type as JobType];

      if (typeof handlerFn === "function") {
        await this.repos.job.updateJobProgress(job.id, {
          progress: 0,
          status: "processing",
        });
        // Call the exported handler function directly
        const result = await (handlerFn as any)(job.payload);
        await this.repos.job.completeJob(job.id, result);
        logger.info("Worker job completed", { id: job.id, type: job.type });
      } else {
        logger.warn("Worker job handler function missing", {
          type: job.type,
          jobId: job.id,
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.repos.job.failJob(job.id, errorMessage);
      logger.error("Worker job failed", {
        id: job.id,
        type: job.type,
        error: errorMessage,
      });
    }
  }

  /**
   * Mark stale processing jobs as failed
   */
  private async markStaleJobs(): Promise<void> {
    const result = await this.repos.job.markStaleJobsAsFailed(
      this.config.staleThresholdMinutes,
    );

    if (result.length > 0) {
      logger.warn("Marked stale jobs as failed", { count: result.length });
    }
  }

  /**
   * Requeue failed jobs that have retries remaining
   */
  private async requeueFailedJobs(): Promise<void> {
    const result = await this.repos.job.requeueFailedJobs();

    if (result.length > 0) {
      logger.info("Requeued failed jobs for retry", { count: result.length });
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

      const job = await this.repos.job.claimNextPendingJob();
      if (job) {
        await this.processJob(job);
      }
    } catch (error) {
      logger.error("Worker polling error", { error });
    }

    if (!this.isShuttingDown) {
      setTimeout(() => this.poll(), this.config.pollIntervalMs);
    }
  }

  /**
   * Start the worker
   */
  start(): void {
    logger.info("Starting job worker");
    this.poll();
  }

  /**
   * Gracefully shutdown the worker
   */
  async shutdown(): Promise<void> {
    logger.info("Shutting down worker");
    this.isShuttingDown = true;
  }
}
