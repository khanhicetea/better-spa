import { z } from "zod";
import { adminProcedure } from "../base";

export const list = adminProcedure
  .input(
    z.object({
      page: z.number().int().positive().catch(1),
    }),
  )
  .handler(async ({ input, context }) => {
    const { repos } = context;
    const { page } = input;
    const pageSize = 10;

    const result = await repos.user.findPaginated({
      page,
      pageSize,
      modify: (qb) => qb.orderBy("createdAt", "desc"),
    });

    return {
      users: result.items,
      page,
      pageSize: result.pageSize,
      totalCount: result.totalCount,
      pageCount: result.pageCount,
    };
  });

export const get = adminProcedure
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context }) => {
    const { repos } = context;
    return (await repos.user.findById(input.id)) ?? null;
  });
