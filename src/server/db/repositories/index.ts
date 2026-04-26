import type { DB } from "../init";
import { Repository } from "./base";
import { JobRepository } from "./job.repo";

export type Repositories = ReturnType<typeof createRepos>;

export function createRepos(db: DB) {
  const repos = {
    user: new Repository(db, "user"),
    todoItem: new Repository(db, "todoItem"),
    job: new JobRepository(db),
  };

  // Inject repos reference into each repository for cross-repository access
  Object.values(repos).forEach((repo) => {
    repo.setRepos(repos);
  });

  return repos;
}
