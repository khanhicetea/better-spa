import { env } from "@/env/server";
import { getDatabase } from "@/lib/db/init";
import { createRepos } from "@/lib/db/repositories";
import { Worker } from "./worker";

async function main() {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  // Initialize db and repos
  const db = getDatabase(env.DATABASE_URL);
  const repos = createRepos(db);

  // Create worker with dependencies
  const worker = new Worker(db, repos);
  worker.start();

  const shutdown = async () => {
    await worker.shutdown();
    await db.destroy();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch(console.error);
