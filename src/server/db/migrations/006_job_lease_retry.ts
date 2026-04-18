import type { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  // Add lease columns
  await db.schema
    .alterTable("job")
    .addColumn("lease_owner", "text")
    .addColumn("lease_expires_at", "timestamptz")
    .execute();

  // Drop old indexes
  await db.schema.dropIndex("idx_job_status_priority_created").execute();
  await db.schema.dropIndex("idx_job_run_at").execute();

  // Add new optimized indexes
  // idx_job_claim: for finding the next eligible job to process
  await db.schema
    .createIndex("idx_job_claim")
    .on("job")
    .columns(["status", "run_at", "priority", "created_at"])
    .execute();

  // idx_job_processing_lease: for finding expired leases
  await db.schema
    .createIndex("idx_job_processing_lease")
    .on("job")
    .columns(["status", "lease_expires_at"])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop new indexes
  await db.schema.dropIndex("idx_job_claim").execute();
  await db.schema.dropIndex("idx_job_processing_lease").execute();

  // Restore old indexes
  await db.schema
    .createIndex("idx_job_status_priority_created")
    .on("job")
    .columns(["status", "priority", "created_at"])
    .execute();

  await db.schema
    .createIndex("idx_job_run_at")
    .on("job")
    .columns(["run_at", "status"])
    .execute();

  // Drop lease columns
  await db.schema.alterTable("job").dropColumn("lease_owner").execute();
  await db.schema.alterTable("job").dropColumn("lease_expires_at").execute();
}
