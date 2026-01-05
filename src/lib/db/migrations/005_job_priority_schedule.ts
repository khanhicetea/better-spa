import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  // Add priority column (0 = low, 5 = normal, 10 = high, 20 = urgent)
  await db.schema
    .alterTable("job")
    .addColumn("priority", "integer", (col) => col.notNull().defaultTo(5))
    .execute();

  // Add run_at column for scheduled jobs
  await db.schema
    .alterTable("job")
    .addColumn("run_at", "timestamp", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  // Update existing index to include priority for efficient polling
  await db.schema.dropIndex("idx_job_status_created").execute();

  await db.schema
    .createIndex("idx_job_status_priority_created")
    .on("job")
    .columns(["status", "priority", "created_at"])
    .execute();

  // Add index for scheduled jobs (find jobs ready to run)
  await db.schema
    .createIndex("idx_job_run_at")
    .on("job")
    .columns(["run_at", "status"])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Restore old index
  await db.schema.dropIndex("idx_job_status_priority_created").execute();
  await db.schema.dropIndex("idx_job_run_at").execute();

  await db.schema
    .createIndex("idx_job_status_created")
    .on("job")
    .columns(["status", "created_at"])
    .execute();

  // Drop columns
  await db.schema.alterTable("job").dropColumn("priority").execute();
  await db.schema.alterTable("job").dropColumn("run_at").execute();
}
