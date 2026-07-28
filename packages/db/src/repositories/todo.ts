import { and, desc, eq } from "drizzle-orm";
import type { DB } from "../client";
import { todoItem, type TodoItemInsert, type TodoItemUpdate } from "../schema/todo";

export class TodoRepository {
  constructor(private db: DB) {}

  listOwned(userId: string) {
    return this.db
      .select()
      .from(todoItem)
      .where(eq(todoItem.userId, userId))
      .orderBy(desc(todoItem.createdAt));
  }

  async create(data: TodoItemInsert) {
    const [created] = await this.db.insert(todoItem).values(data).returning();
    return created;
  }

  async updateOwned(userId: string, id: string, data: TodoItemUpdate) {
    const [updated] = await this.db
      .update(todoItem)
      .set(data)
      .where(and(eq(todoItem.id, id), eq(todoItem.userId, userId)))
      .returning();
    return updated;
  }

  async deleteOwned(userId: string, id: string): Promise<string | undefined> {
    const [deleted] = await this.db
      .delete(todoItem)
      .where(and(eq(todoItem.id, id), eq(todoItem.userId, userId)))
      .returning({ id: todoItem.id });
    return deleted?.id;
  }
}
