import type { DB } from "../init";
import { Repository } from "./base";

export class UserRepository extends Repository<"user"> {
  constructor(db: DB) {
    super(db, "user");
  }
}
