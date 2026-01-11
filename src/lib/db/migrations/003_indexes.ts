import type { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  // User table indexes
  await db.schema
    .createIndex("idx_user_email")
    .on("user")
    .column("email")
    .execute();

  // Session table indexes
  await db.schema
    .createIndex("idx_session_user_id")
    .on("session")
    .column("user_id")
    .execute();

  await db.schema
    .createIndex("idx_session_expires_at")
    .on("session")
    .column("expires_at")
    .execute();

  // Account table indexes
  await db.schema
    .createIndex("idx_account_user_id")
    .on("account")
    .column("user_id")
    .execute();

  await db.schema
    .createIndex("idx_account_provider_account")
    .on("account")
    .columns(["provider_id", "account_id"])
    .execute();

  // Todo item indexes
  await db.schema
    .createIndex("idx_todo_item_user_id")
    .on("todo_item")
    .column("user_id")
    .execute();

  await db.schema
    .createIndex("idx_todo_item_completed_at")
    .on("todo_item")
    .column("completed_at")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex("idx_todo_item_completed_at").execute();
  await db.schema.dropIndex("idx_todo_item_user_id").execute();
  await db.schema.dropIndex("idx_account_provider_account").execute();
  await db.schema.dropIndex("idx_account_user_id").execute();
  await db.schema.dropIndex("idx_session_expires_at").execute();
  await db.schema.dropIndex("idx_session_user_id").execute();
  await db.schema.dropIndex("idx_user_email").execute();
}
