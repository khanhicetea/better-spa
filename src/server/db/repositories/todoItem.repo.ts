import type { DB } from "../init";
import { Repository } from "./base";

export class TodoItemRepository extends Repository<"todoItem"> {
  constructor(db: DB) {
    super(db, "todoItem");
  }

  async findTodoItemsByUserId(userId: string) {
    return this.find({
      where: { userId },
      modify: (qb) => qb.orderBy("createdAt", "desc"),
    });
  }
}
