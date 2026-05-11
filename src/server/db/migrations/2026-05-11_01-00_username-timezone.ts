import type { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable("user").addColumn("username", "text").execute();

  await db.schema
    .createIndex("idx_user_username")
    .on("user")
    .column("username")
    .unique()
    .execute();

  await db.schema.alterTable("user").addColumn("timezone", "text").execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable("user").dropColumn("timezone").execute();
  await db.schema.dropIndex("idx_user_username").execute();
  await db.schema.alterTable("user").dropColumn("username").execute();
}
