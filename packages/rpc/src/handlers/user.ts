import * as z from "zod";
import type { RequestContext } from "../context";
import { adminProcedure, authedProcedure } from "../base";
import { adminUserSchema, selfUserSchema, toAdminUser, toSelfUser } from "../dto";

function isPostgresError(error: unknown): error is { code: string; constraint?: string } {
  return typeof error === "object" && error !== null && "code" in error;
}

function mapWriteError(
  error: unknown,
  errors: {
    CONFLICT: (options?: { message?: string }) => Error;
  },
): never {
  if (isPostgresError(error) && (error.code === "23505" || error.code === "23503")) {
    throw errors.CONFLICT({
      message: error.code === "23505" ? "A record with those values already exists" : "Conflict",
    });
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error.status === 409 || error.status === 422)
  ) {
    throw errors.CONFLICT({
      message: error instanceof Error ? error.message : "A conflicting account already exists",
    });
  }
  throw error;
}

async function reloadAdminUser(userId: string, context: Pick<RequestContext, "repos">) {
  const user = await context.repos.user.findById(userId);
  if (!user) throw new Error("Better Auth returned a user that could not be reloaded");
  return toAdminUser(user);
}

export const list = adminProcedure
  .input(z.object({ page: z.number().int().positive().catch(1) }))
  .output(
    z.object({
      users: z.array(adminUserSchema),
      page: z.number(),
      pageSize: z.number(),
      totalCount: z.number(),
      pageCount: z.number(),
    }),
  )
  .handler(async ({ input, context }) => {
    const result = await context.repos.user.listAdminPage({
      page: input.page,
      pageSize: 10,
    });
    return { ...result, users: result.items.map(toAdminUser) };
  });

export const updateProfile = authedProcedure
  .input(
    z.object({
      name: z.string().min(1).max(100).optional(),
      username: z
        .string()
        .min(1)
        .max(30)
        .regex(/^[a-zA-Z0-9_-]+$/)
        .optional(),
      timezone: z.string().min(1).optional(),
    }),
  )
  .output(selfUserSchema)
  .handler(async ({ input, context, errors }) => {
    const data: { name?: string; username?: string; timezone?: string; updatedAt: Date } = {
      updatedAt: new Date(),
    };
    if (input.name !== undefined) data.name = input.name;
    if (input.username !== undefined) data.username = input.username;
    if (input.timezone !== undefined) data.timezone = input.timezone;

    try {
      const user = await context.repos.user.updateById({ id: context.user.id, data });
      if (!user) throw errors.NOT_FOUND();
      return toSelfUser(user);
    } catch (error) {
      return mapWriteError(error, errors);
    }
  });

export const create = adminProcedure
  .input(
    z.object({
      email: z.email(),
      password: z.string().min(8),
      name: z.string().min(1).max(100),
      role: z.enum(["user", "admin"]),
    }),
  )
  .output(adminUserSchema)
  .handler(async ({ input, context, errors }) => {
    try {
      const result = await context.auth.api.createUser({
        headers: context.headers,
        body: input,
      });
      return reloadAdminUser(result.user.id, context);
    } catch (error) {
      return mapWriteError(error, errors);
    }
  });

export const ban = adminProcedure
  .input(
    z.object({
      userId: z.string(),
      banReason: z.string().max(500).optional(),
      banExpiresIn: z.number().int().positive().optional(),
    }),
  )
  .output(adminUserSchema)
  .handler(async ({ input, context }) => {
    const result = await context.auth.api.banUser({
      headers: context.headers,
      body: input,
    });
    return reloadAdminUser(result.user.id, context);
  });

export const unban = adminProcedure
  .input(z.object({ userId: z.string() }))
  .output(adminUserSchema)
  .handler(async ({ input, context }) => {
    const result = await context.auth.api.unbanUser({
      headers: context.headers,
      body: input,
    });
    return reloadAdminUser(result.user.id, context);
  });

export const resetPassword = adminProcedure
  .input(z.object({ userId: z.string(), newPassword: z.string().min(8) }))
  .output(z.object({ success: z.boolean() }))
  .handler(async ({ input, context }) => {
    const result = await context.auth.api.setUserPassword({
      headers: context.headers,
      body: input,
    });
    return { success: result.status };
  });

export const impersonate = adminProcedure
  .input(z.object({ userId: z.string() }))
  .output(z.object({ success: z.literal(true) }))
  .handler(async ({ input, context }) => {
    const result = await context.auth.api.impersonateUser({
      headers: context.headers,
      body: input,
      returnHeaders: true,
    });
    result.headers.forEach((value, key) => context.resHeaders.append(key, value));
    return { success: true };
  });
