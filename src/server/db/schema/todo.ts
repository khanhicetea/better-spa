import type { ColumnType, Generated, Insertable, Selectable, Updateable } from "kysely";

export interface TodoItemTable {
  id: Generated<string>;
  userId: string;
  content: string;
  completedAt: Date | null;
  createdAt: ColumnType<Date, Date | undefined, never>;
  updatedAt: Date;
}

export type TodoItem = Selectable<TodoItemTable>;
export type TodoItemInsert = Insertable<TodoItemTable>;
export type TodoItemUpdate = Updateable<TodoItemTable>;
