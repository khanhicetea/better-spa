import { count, desc, eq } from "drizzle-orm";
import type { DB } from "../client";
import { user, type UserInsert, type UserUpdate } from "../schema/auth";
import { BaseRepository } from "./base";

export type AdminUserListFilter = { page: number; pageSize: number };

export class UserRepository extends BaseRepository<typeof user, UserInsert, UserUpdate> {
  constructor(db: DB) {
    super(db, user);
  }

  findById(id: string) {
    return this.findOne(eq(user.id, id));
  }

  updateById(id: string, data: UserUpdate) {
    return this.updateOne(eq(user.id, id), data);
  }

  async listAdminPage({ page, pageSize }: AdminUserListFilter) {
    const [items, countRows] = await Promise.all([
      this.db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          image: user.image,
          role: user.role,
          banned: user.banned,
          banReason: user.banReason,
          banExpires: user.banExpires,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        })
        .from(user)
        .orderBy(desc(user.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.db.select({ count: count() }).from(user),
    ]);
    const value = Number(countRows[0]?.count ?? 0);
    const totalCount = Number.isFinite(value) ? value : 0;
    return {
      items,
      totalCount,
      pageCount: Math.ceil(totalCount / pageSize),
      page,
      pageSize,
    };
  }
}
