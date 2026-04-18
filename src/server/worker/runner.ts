import os from "node:os";
import { env } from "@/env/server";
import { getDatabase } from "@/server/db/init";
import { createRepos } from "@/server/db/repositories";
import { logger } from "@/server/logger";
import { Worker } from "./worker";

async function main() {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  // Initialize db and repos
  const db = getDatabase(env.DATABASE_URL);
  const repos = createRepos(db);

  // Generate a stable worker ID
  const hostname = os.hostname();
  const workerId = `${hostname}-${process.pid}-${Math.random().toString(36).substring(2, 8)}`;

  // Create worker with dependencies
  const worker = new Worker(db, repos, {
    workerId,
    concurrency: Number.parseInt(process.env.WORKER_CONCURRENCY || "1", 10),
  });
  worker.start();

  let isShuttingDown = false;
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info(`Received ${signal}, starting graceful shutdown...`);
    await worker.shutdown();
    await db.destroy();
    logger.info("Worker runner exited cleanly");
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((error) => {
  logger.error("Worker runner failed", { error });
});
