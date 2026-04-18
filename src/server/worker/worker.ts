import { createRouterClient } from "@orpc/server";
import type { DB } from "@/server/db/init";
import type { Repositories } from "@/server/db/repositories";
import type { Job, JobStatus } from "@/server/db/schema/job";
import { logger } from "@/server/logger";
import { type JobType, workerRpc } from "./rpc";
import {
  DEFAULT_WORKER_CONFIG,
  NonRetryableJobError,
  type WorkerConfig,
} from "./types";

export class Worker {
  private db: DB;
  private repos: Repositories;
  private config: WorkerConfig;
  private isShuttingDown = false;
  private activeJobs = new Set<Promise<void>>();
  private pollTimeout: NodeJS.Timeout | null = null;
  private recoveryInterval: NodeJS.Timeout | null = null;
  private lastActivityAt = Date.now();

  constructor(db: DB, repos: Repositories, config: Partial<WorkerConfig> = {}) {
    this.db = db;
    this.repos = repos;
    this.config = { ...DEFAULT_WORKER_CONFIG, ...config };
  }

  private touchActivity(): void {
    this.lastActivityAt = Date.now();
  }

  getStats() {
    return {
      workerId: this.config.workerId,
      concurrency: this.config.concurrency,
      activeJobs: this.activeJobs.size,
      isShuttingDown: this.isShuttingDown,
      lastActivityAt: this.lastActivityAt,
    };
  }

  /**
   * Process a single job using oRPC handler
   */
  private async processJob(job: Job): Promise<void> {
    this.touchActivity();

    logger.info("Processing worker job", {
      id: job.id,
      type: job.type,
      label: job.label,
    });

    let heartbeatInterval: NodeJS.Timeout | null = null;

    try {
      // Start lease heartbeat
      heartbeatInterval = setInterval(async () => {
        try {
          const leaseExpiresAt = new Date(
            Date.now() + this.config.leaseDurationMs,
          );
          const success = await this.repos.job.renewLease(
            job.id,
            this.config.workerId,
            leaseExpiresAt,
          );
          if (!success) {
            logger.warn("Worker failed to renew lease, job might be lost", {
              jobId: job.id,
            });
          }
        } catch (error) {
          logger.error("Error renewing worker lease", { jobId: job.id, error });
        }
      }, this.config.leaseHeartbeatMs);

      // Get handler module from worker RPC
      const handlerModule = workerRpc[job.type as JobType];
      if (!handlerModule) {
        throw new NonRetryableJobError(`Unknown job type: ${job.type}`);
      }

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
              this.repos.job.updateJobProgress(job.id, this.config.workerId, {
                progress,
                status,
              }),
          };
        },
      });

      // Check if handler has a directly exported handler function
      const handlerFn = rpcClient[job.type as JobType];

      if (typeof handlerFn === "function") {
        // Call the exported handler function directly
        const result = await (
          handlerFn as (input: unknown) => Promise<unknown>
        )(job.payload);
        await this.repos.job.completeOwnedJob(
          job.id,
          this.config.workerId,
          result,
        );
        this.touchActivity();
        logger.info("Worker job completed", { id: job.id, type: job.type });
      } else {
        throw new NonRetryableJobError("Worker job handler function missing");
      }
    } catch (error) {
      const isRetryable = !(error instanceof NonRetryableJobError);
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await this.repos.job.retryOrFailOwnedJob(
        job.id,
        this.config.workerId,
        errorMessage,
        isRetryable,
      );
      this.touchActivity();

      logger.error("Worker job failed", {
        id: job.id,
        type: job.type,
        error: errorMessage,
        retryable: isRetryable,
      });
    } finally {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    }
  }

  /**
   * Run recovery query to find expired leases and reschedule them
   */
  private async recoverExpiredLeases(): Promise<void> {
    try {
      const recovered = await this.repos.job.recoverExpiredLeases(new Date());
      if (recovered.length > 0) {
        this.touchActivity();
        logger.warn("Recovered jobs with expired leases", {
          count: recovered.length,
          jobIds: recovered.map((j) => j.id),
        });
      }
    } catch (error) {
      logger.error("Error recovering expired leases", { error });
    }
  }

  /**
   * Main poll loop
   */
  private async poll(): Promise<void> {
    if (this.isShuttingDown) return;

    // Wait if we're at capacity
    if (this.activeJobs.size >= this.config.concurrency) {
      this.pollTimeout = setTimeout(
        () => this.poll(),
        this.config.pollIntervalMs,
      );
      return;
    }

    try {
      const leaseExpiresAt = new Date(Date.now() + this.config.leaseDurationMs);
      const job = await this.repos.job.claimNextRunnableJob(
        this.config.workerId,
        leaseExpiresAt,
      );

      if (job) {
        this.touchActivity();
        const jobPromise = this.processJob(job);
        this.activeJobs.add(jobPromise);
        jobPromise.finally(() => {
          this.activeJobs.delete(jobPromise);
          // When a job finishes, try to claim another one immediately
          if (!this.isShuttingDown) {
            setImmediate(() => this.poll());
          }
        });

        // If we have more capacity, try to claim another job immediately
        if (this.activeJobs.size < this.config.concurrency) {
          setImmediate(() => this.poll());
          return;
        }
      }
    } catch (error) {
      logger.error("Worker polling error", { error });
    }

    // Schedule next poll if we didn't claim a job or reached capacity
    if (!this.isShuttingDown) {
      this.pollTimeout = setTimeout(
        () => this.poll(),
        this.config.pollIntervalMs,
      );
    }
  }

  /**
   * Start the worker
   */
  start(): void {
    logger.info("Starting job worker", {
      workerId: this.config.workerId,
      concurrency: this.config.concurrency,
    });

    // Start recovery interval
    this.recoveryInterval = setInterval(
      () => this.recoverExpiredLeases(),
      this.config.recoveryIntervalMs,
    );

    // Run initial poll
    this.poll();
  }

  /**
   * Gracefully shutdown the worker
   */
  async shutdown(): Promise<void> {
    logger.info("Shutting down worker", {
      activeJobs: this.activeJobs.size,
    });

    this.isShuttingDown = true;

    if (this.pollTimeout) clearTimeout(this.pollTimeout);
    if (this.recoveryInterval) clearInterval(this.recoveryInterval);

    // Wait for active jobs to complete
    if (this.activeJobs.size > 0) {
      logger.info(`Waiting for ${this.activeJobs.size} active jobs to finish`);
      await Promise.all(this.activeJobs);
    }

    logger.info("Worker shutdown complete");
  }
}
