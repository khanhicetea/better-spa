import type { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("todo_category")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("user_id", "text", (col) =>
      col
        .notNull()
        .references("user.id")
        .onDelete("cascade")
        .onUpdate("cascade"),
    )
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo("now()"),
    )
    .addColumn("updated_at", "timestamptz", (col) =>
      col.notNull().defaultTo("now()"),
    )
    .execute();

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
    .addColumn("category_id", "text", (col) =>
      col
        .notNull()
        .references("todo_category.id")
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
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("todo_item").execute();
  await db.schema.dropTable("todo_category").execute();
}
