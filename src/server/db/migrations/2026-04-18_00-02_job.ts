import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("job")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("user_id", "text", (col) =>
      col.notNull().references("user.id").onDelete("cascade").onUpdate("cascade"),
    )
    .addColumn("type", "text", (col) => col.notNull())
    .addColumn("label", "text", (col) => col.notNull())
    .addColumn("status", "text", (col) => col.notNull().defaultTo("pending"))
    .addColumn("progress", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("payload", "jsonb")
    .addColumn("result", "jsonb")
    .addColumn("error", "text")
    .addColumn("retry_count", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("max_retries", "integer", (col) => col.notNull().defaultTo(3))
    .addColumn("priority", "integer", (col) => col.notNull().defaultTo(5))
    .addColumn("run_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("lease_owner", "text")
    .addColumn("lease_expires_at", "timestamptz")
    .addColumn("started_at", "timestamptz")
    .addColumn("completed_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo("now()"))
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo("now()"))
    .execute();

  await db.schema.createIndex("idx_job_user_id").on("job").column("user_id").execute();

  await db.schema
    .createIndex("idx_job_claim")
    .on("job")
    .columns(["status", "run_at", "priority", "created_at"])
    .execute();

  await db.schema
    .createIndex("idx_job_processing_lease")
    .on("job")
    .columns(["status", "lease_expires_at"])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("job").execute();
}
