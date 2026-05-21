import type { DB } from "../client";
import { Repository } from "./repository";

export type Repositories = ReturnType<typeof createRepos>;

export function createRepos(db: DB) {
  const repos = {
    user: new Repository(db, "user"),
    todoItem: new Repository(db, "todoItem"),
  };

  // Inject repos reference into each repository for cross-repository access
  Object.values(repos).forEach((repo) => {
    repo.setRepos(repos);
  });

  return repos;
}
