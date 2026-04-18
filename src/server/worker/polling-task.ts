import os from "node:os";
import { env } from "@/env/server";
import { getDatabase } from "@/server/db/init";
import { createRepos } from "@/server/db/repositories";
import { logger } from "@/server/logger";
import { Worker } from "./worker";

export interface JobPollingTaskOptions {
  concurrency?: number;
  pollIntervalMs?: number;
  maxRuntimeMs?: number;
  idleShutdownMs?: number;
  statusCheckMs?: number;
}

export interface JobPollingTaskResult {
  reason: "max_runtime_reached" | "idle_shutdown";
  runtimeMs: number;
  workerId: string;
  stats: ReturnType<Worker["getStats"]>;
}

const DEFAULT_JOB_POLLING_TASK_OPTIONS: Required<JobPollingTaskOptions> = {
  concurrency: Number.parseInt(process.env.WORKER_CONCURRENCY || "1", 10),
  pollIntervalMs: 1000,
  maxRuntimeMs: 45_000,
  idleShutdownMs: 5_000,
  statusCheckMs: 500,
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runJobPollingTask(
  options: JobPollingTaskOptions = {},
): Promise<JobPollingTaskResult> {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const config = {
    ...DEFAULT_JOB_POLLING_TASK_OPTIONS,
    ...options,
  };

  const db = getDatabase(env.DATABASE_URL);
  const repos = createRepos(db);
  const hostname = os.hostname();
  const workerId = `nitro-task-${hostname}-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;

  const worker = new Worker(db, repos, {
    workerId,
    concurrency: config.concurrency,
    pollIntervalMs: config.pollIntervalMs,
  });

  const startedAt = Date.now();
  let reason: JobPollingTaskResult["reason"] = "max_runtime_reached";

  logger.info("Starting Nitro job polling task", {
    workerId,
    concurrency: config.concurrency,
    pollIntervalMs: config.pollIntervalMs,
    maxRuntimeMs: config.maxRuntimeMs,
    idleShutdownMs: config.idleShutdownMs,
  });

  worker.start();

  try {
    while (Date.now() - startedAt < config.maxRuntimeMs) {
      const stats = worker.getStats();
      const idleForMs = Date.now() - stats.lastActivityAt;
      const isIdle =
        stats.activeJobs === 0 && idleForMs >= config.idleShutdownMs;

      if (isIdle) {
        reason = "idle_shutdown";
        break;
      }

      await sleep(config.statusCheckMs);
    }
  } finally {
    await worker.shutdown();
    await db.destroy();
  }

  const runtimeMs = Date.now() - startedAt;
  const stats = worker.getStats();

  logger.info("Nitro job polling task finished", {
    workerId,
    reason,
    runtimeMs,
    stats,
  });

  return {
    reason,
    runtimeMs,
    workerId,
    stats,
  };
}
