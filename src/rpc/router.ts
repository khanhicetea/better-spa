import * as app from "./handlers/app";
import * as auth from "./handlers/auth";
import * as job from "./handlers/job";
import * as todo from "./handlers/todo";
import * as user from "./handlers/user";

export const rpcRouter = {
  app,
  auth,
  user: {
    list: user.list,
    get: user.get,
  },
  todo: {
    list: todo.list,
    create: todo.create,
    update: todo.update,
    delete: todo.remove,
    export: todo.exportData,
  },
  job: {
    create: job.create,
    listAdmin: job.listAdmin,
    list: job.list,
    get: job.get,
    cancel: job.cancel,
  },
};
