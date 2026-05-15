import { z } from "zod";
import { adminProcedure, authedProcedure } from "../base";

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

export const updateProfile = authedProcedure
  .input(
    z.object({
      name: z
        .string()
        .min(1, "Name is required")
        .max(100, "Name must be 100 characters or less")
        .optional(),
      username: z
        .string()
        .min(1, "Username is required")
        .max(30, "Username must be 30 characters or less")
        .regex(
          /^[a-zA-Z0-9_-]+$/,
          "Username can only contain letters, numbers, hyphens, and underscores",
        )
        .optional(),
      timezone: z.string().min(1).optional(),
    }),
  )
  .handler(async ({ input, context }) => {
    const { user, repos } = context;

    if (!input.name && !input.username && !input.timezone) {
      return user;
    }

    if (input.username) {
      const existing = await repos.user.findOne({
        where: { username: input.username },
      });
      if (existing && existing.id !== user.id) {
        throw new Error("Username is already taken");
      }
    }

    const data: Record<string, string> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.username !== undefined) data.username = input.username;
    if (input.timezone !== undefined) data.timezone = input.timezone;

    return repos.user.updateById({
      id: user.id,
      data,
    });
  });
