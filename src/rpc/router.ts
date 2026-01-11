import * as app from "./handlers/app";
import * as auth from "./handlers/auth";
import * as form from "./handlers/form";
import * as job from "./handlers/job";
import * as todoItem from "./handlers/todoItem";
import * as user from "./handlers/user";

export const rpcRouter = {
  app,
  auth,
  user,
  form,
  todoItem,
  job,
};
