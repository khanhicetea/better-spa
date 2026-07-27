import { sql } from "kysely";
import type { DB } from "../client";
import { Repository } from "./repository";

export type AdminUserListFilter = {
  page: number;
  pageSize: number;
};

export class UserRepository extends Repository<"user"> {
  constructor(db: DB) {
    super(db, "user");
  }

  async listAdminPage({ page, pageSize }: AdminUserListFilter) {
    const baseQuery = () => this.db.selectFrom("user");
    const offset = (page - 1) * pageSize;

    const [items, countRow] = await Promise.all([
      baseQuery()
        .select([
          "id",
          "name",
          "email",
          "emailVerified",
          "image",
          "role",
          "banned",
          "banReason",
          "banExpires",
          "createdAt",
          "updatedAt",
        ])
        .orderBy("createdAt", "desc")
        .limit(pageSize)
        .offset(offset)
        .execute(),
      baseQuery()
        .select(sql<number>`count(*)`.as("count"))
        .executeTakeFirstOrThrow(),
    ]);

    const count = Number(countRow.count);
    const totalCount = Number.isFinite(count) ? count : 0;
    return {
      items,
      totalCount,
      pageCount: Math.ceil(totalCount / pageSize),
      page,
      pageSize,
    };
  }
}
