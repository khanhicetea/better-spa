import { CamelCasePlugin, Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import type { Database } from "../src/lib/db/schema";
import type { Job, JobStatus } from "../src/lib/db/schema/job";

const { Pool } = pg;

// Configuration
const POLL_INTERVAL_MS = 2000;
const STALE_CHECK_INTERVAL_MS = 60000;

function initDB(): Kysely<Database> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  return new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString,
        max: 2,
      }),
    }),
    plugins: [new CamelCasePlugin()],
  });
}

async function claimNextJob(db: Kysely<Database>): Promise<Job | undefined> {
  const result = await db
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

async function updateJobProgress(
  db: Kysely<Database>,
  jobId: string,
  progress: number,
): Promise<void> {
  await db
    .updateTable("job")
    .set({
      progress,
      updatedAt: new Date(),
    })
    .where("id", "=", jobId)
    .execute();
}

async function completeJob(
  db: Kysely<Database>,
  jobId: string,
  result: unknown,
): Promise<void> {
  await db
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

async function failJob(
  db: Kysely<Database>,
  jobId: string,
  error: string,
): Promise<void> {
  await db
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

type JobHandler = (
  db: Kysely<Database>,
  job: Job,
  updateProgress: (progress: number) => Promise<void>,
) => Promise<unknown>;

const jobHandlers: Record<string, JobHandler> = {
  export_todos: async (db, job, updateProgress) => {
    const payload = job.payload as { userId: string };

    await updateProgress(10);
    await new Promise((r) => setTimeout(r, 2000));

    // Fetch categories
    const categories = await db
      .selectFrom("todoCategory")
      .selectAll()
      .where("userId", "=", payload.userId)
      .execute();

    await updateProgress(30);
    await new Promise((r) => setTimeout(r, 2000));

    // Fetch todo items
    const todoItems = await db
      .selectFrom("todoItem")
      .selectAll()
      .where("userId", "=", payload.userId)
      .execute();

    await updateProgress(60);
    await new Promise((r) => setTimeout(r, 2000));

    // Build export data
    const exportData = {
      exportedAt: new Date().toISOString(),
      categories: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        createdAt: cat.createdAt,
        items: todoItems
          .filter((item) => item.categoryId === cat.id)
          .map((item) => ({
            id: item.id,
            content: item.content,
            completedAt: item.completedAt,
            createdAt: item.createdAt,
          })),
      })),
      summary: {
        totalCategories: categories.length,
        totalItems: todoItems.length,
        completedItems: todoItems.filter((item) => item.completedAt).length,
      },
    };

    await updateProgress(90);
    await new Promise((r) => setTimeout(r, 2000));

    // Simulate some processing time for demo
    await new Promise((resolve) => setTimeout(resolve, 500));

    await updateProgress(100);

    return exportData;
  },
};

async function processJob(db: Kysely<Database>, job: Job): Promise<void> {
  console.log(`Processing job ${job.id} (${job.type}): ${job.label}`);

  const handler = jobHandlers[job.type];
  if (!handler) {
    await failJob(db, job.id, `Unknown job type: ${job.type}`);
    console.error(`Unknown job type: ${job.type}`);
    return;
  }

  try {
    const updateProgress = (progress: number) => updateJobProgress(db, job.id, progress);

    const result = await handler(db, job, updateProgress);
    await completeJob(db, job.id, result);
    console.log(`Job ${job.id} completed successfully`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await failJob(db, job.id, errorMessage);
    console.error(`Job ${job.id} failed:`, errorMessage);
  }
}

async function markStaleJobs(db: Kysely<Database>): Promise<void> {
  const threshold = new Date(Date.now() - 5 * 60 * 1000);

  const result = await db
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

async function requeueFailedJobs(db: Kysely<Database>): Promise<void> {
  const result = await db
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

async function main() {
  console.log("Starting job worker...");
  const db = initDB();

  let lastStaleCheck = 0;
  let isShuttingDown = false;

  const pollForJobs = async () => {
    if (isShuttingDown) return;

    try {
      const now = Date.now();
      if (now - lastStaleCheck > STALE_CHECK_INTERVAL_MS) {
        await markStaleJobs(db);
        await requeueFailedJobs(db);
        lastStaleCheck = now;
      }

      const job = await claimNextJob(db);
      if (job) {
        await processJob(db, job);
      }
    } catch (error) {
      console.error("Worker error:", error);
    }

    if (!isShuttingDown) {
      setTimeout(pollForJobs, POLL_INTERVAL_MS);
    }
  };

  pollForJobs();

  const shutdown = async () => {
    console.log("Shutting down worker...");
    isShuttingDown = true;
    await db.destroy();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch(console.error);
