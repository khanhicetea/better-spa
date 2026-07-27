import type { TodoItemUpdate } from "../schema/todo";
import type { DB } from "../client";
import { Repository } from "./repository";

export class TodoRepository extends Repository<"todoItem"> {
  constructor(db: DB) {
    super(db, "todoItem");
  }

  updateOwned(userId: string, id: string, data: TodoItemUpdate) {
    return this.db
      .updateTable("todoItem")
      .set(data)
      .where("id", "=", id)
      .where("userId", "=", userId)
      .returningAll()
      .executeTakeFirst();
  }

  async deleteOwned(userId: string, id: string): Promise<boolean> {
    const result = await this.db
      .deleteFrom("todoItem")
      .where("id", "=", id)
      .where("userId", "=", userId)
      .executeTakeFirst();

    return result.numDeletedRows > 0n;
  }
}
