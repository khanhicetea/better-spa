import type { DB } from "../client";
import { TodoRepository } from "./todo";
import { UserRepository } from "./user";

export type Repositories = ReturnType<typeof createRepos>;

export function createRepos(db: DB) {
  const repos = {
    user: new UserRepository(db),
    todoItem: new TodoRepository(db),
  };

  // Inject repos reference into each repository for cross-repository access
  Object.values(repos).forEach((repo) => {
    repo.setRepos(repos);
  });

  return repos;
}
