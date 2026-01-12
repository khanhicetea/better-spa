import type { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("product")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("user_id", "text", (col) =>
      col
        .notNull()
        .references("user.id")
        .onDelete("cascade")
        .onUpdate("cascade"),
    )
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("description", "text")
    .addColumn("images", "jsonb")
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo("now()"),
    )
    .addColumn("updated_at", "timestamptz", (col) =>
      col.notNull().defaultTo("now()"),
    )
    .execute();

  await db.schema
    .createIndex("idx_product_user_id")
    .on("product")
    .column("user_id")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("product").execute();
}
