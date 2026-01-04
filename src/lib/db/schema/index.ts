import type {
  UserTable,
  SessionTable,
  AccountTable,
  VerificationTable,
} from "./auth";
import type { JobTable } from "./job";
import type { TodoCategoryTable, TodoItemTable } from "./todo";

export interface Database {
  user: UserTable;
  session: SessionTable;
  account: AccountTable;
  verification: VerificationTable;
  todoCategory: TodoCategoryTable;
  todoItem: TodoItemTable;
  job: JobTable;
}
