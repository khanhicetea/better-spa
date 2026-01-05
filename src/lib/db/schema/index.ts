import type {
  UserTable,
  SessionTable,
  AccountTable,
  VerificationTable,
} from "./auth";
import type { JobTable } from "./job";
import type { TodoCategoryTable, TodoItemTable } from "./todo";

// Re-export job enums for convenience
export { JobPriority } from "./job";

export interface Database {
  user: UserTable;
  session: SessionTable;
  account: AccountTable;
  verification: VerificationTable;
  todoCategory: TodoCategoryTable;
  todoItem: TodoItemTable;
  job: JobTable;
}
