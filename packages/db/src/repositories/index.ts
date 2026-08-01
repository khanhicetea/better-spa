import type { DB } from "../client";
import { TodoRepository } from "./todo";
import { UserRepository } from "./user";

export { BaseRepository } from "./base";
export type Repositories = ReturnType<typeof createRepos>;

export function createRepos(db: DB) {
  return { user: new UserRepository(db), todoItem: new TodoRepository(db) };
}
