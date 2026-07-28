export * from "./auth";
export * from "./todo";

import { account, session, user, verification } from "./auth";
import { todoItem } from "./todo";

export const schema = { user, session, account, verification, todoItem };
