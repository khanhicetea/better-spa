import type { UserTable, SessionTable, AccountTable, VerificationTable } from "./auth";
import type { TodoItemTable } from "./todo";

export interface Database {
  user: UserTable;
  session: SessionTable;
  account: AccountTable;
  verification: VerificationTable;
  todoItem: TodoItemTable;
}
