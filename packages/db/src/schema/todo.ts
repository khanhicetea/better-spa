import { foreignKey, index, pgTableCreator, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

const table = pgTableCreator((name) => name, "snake_case");
const timestamptz = () => timestamp({ withTimezone: true, mode: "date" });

export const todoItem = table(
  "todo_item",
  {
    id: text().primaryKey(),
    userId: text().notNull(),
    content: text().notNull(),
    completedAt: timestamptz(),
    createdAt: timestamptz().notNull().defaultNow(),
    updatedAt: timestamptz().notNull().defaultNow(),
  },
  (table) => [
    index("idx_todo_item_user_id").on(table.userId),
    index("idx_todo_item_completed_at").on(table.completedAt),
    foreignKey({
      name: "todo_item_user_id_fkey",
      columns: [table.userId],
      foreignColumns: [user.id],
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
  ],
);

export type TodoItem = typeof todoItem.$inferSelect;
export type TodoItemInsert = typeof todoItem.$inferInsert;
export type TodoItemUpdate = Partial<Pick<TodoItem, "content" | "completedAt" | "updatedAt">>;
