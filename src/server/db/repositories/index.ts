import type { DB } from "../init";
import { JobRepository } from "./job.repo";
import { ProductRepository } from "./product.repo";
import { TodoItemRepository } from "./todoItem.repo";
import { UserRepository } from "./user.repo";

export type Repositories = ReturnType<typeof createRepos>;

export function createRepos(db: DB) {
  const repos = {
    user: new UserRepository(db),
    todoItem: new TodoItemRepository(db),
    job: new JobRepository(db),
    product: new ProductRepository(db),
  };

  // Inject repos reference into each repository for cross-repository access
  Object.values(repos).forEach((repo) => {
    repo.setRepos(repos);
  });

  return repos;
}
