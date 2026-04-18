import type { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("todo_item")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("user_id", "text", (col) =>
      col
        .notNull()
        .references("user.id")
        .onDelete("cascade")
        .onUpdate("cascade"),
    )
    .addColumn("content", "text", (col) => col.notNull())
    .addColumn("completed_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo("now()"),
    )
    .addColumn("updated_at", "timestamptz", (col) =>
      col.notNull().defaultTo("now()"),
    )
    .execute();

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
  await db.schema.dropTable("todo_item").execute();
}
