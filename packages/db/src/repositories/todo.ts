import { and, desc, eq } from "drizzle-orm";
import type { DB } from "../client";
import { todoItem, type TodoItemInsert, type TodoItemUpdate } from "../schema/todo";
import { BaseRepository } from "./base";

export class TodoRepository extends BaseRepository<
  typeof todoItem,
  TodoItemInsert,
  TodoItemUpdate
> {
  constructor(db: DB) {
    super(db, todoItem);
  }

  listOwned(userId: string) {
    return this.db
      .select()
      .from(todoItem)
      .where(eq(todoItem.userId, userId))
      .orderBy(desc(todoItem.createdAt));
  }

  create(data: TodoItemInsert) {
    return this.insertOne(data);
  }

  updateOwned(userId: string, id: string, data: TodoItemUpdate) {
    return this.updateOne(and(eq(todoItem.id, id), eq(todoItem.userId, userId)), data);
  }

  async deleteOwned(userId: string, id: string): Promise<string | undefined> {
    const deleted = await this.deleteOne(and(eq(todoItem.id, id), eq(todoItem.userId, userId)));
    return deleted?.id;
  }
}
