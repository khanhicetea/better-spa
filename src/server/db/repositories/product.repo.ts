import type { DB } from "../init";
import { Repository } from "./base";

export class ProductRepository extends Repository<"product"> {
  constructor(db: DB) {
    super(db, "product");
  }

  async findProductsByUserId(userId: string) {
    return this.find({
      where: { userId },
      modify: (qb) => qb.orderBy("createdAt", "desc"),
    });
  }

  async findPaginatedProductsByUserId(
    userId: string,
    page: number,
    pageSize: number,
  ) {
    return this.findPaginated({
      page,
      pageSize,
      where: { userId },
      modify: (qb) => qb.orderBy("createdAt", "desc"),
    });
  }
}
