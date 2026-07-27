import * as app from "./handlers/app";
import * as file from "./handlers/file";
import * as todo from "./handlers/todo";
import * as user from "./handlers/user";

export const rpcRouter = {
  app,
  user: {
    list: user.list,
    updateProfile: user.updateProfile,
    create: user.create,
    ban: user.ban,
    unban: user.unban,
    resetPassword: user.resetPassword,
    impersonate: user.impersonate,
  },
  file,
  todo: {
    list: todo.list,
    create: todo.create,
    update: todo.update,
    delete: todo.remove,
  },
};
