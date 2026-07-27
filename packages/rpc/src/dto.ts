import * as z from "zod";

export const isoDateSchema = z.iso.datetime();
export const roleSchema = z.enum(["admin", "user"]);

export const selfUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  role: roleSchema,
  username: z.string().nullable(),
  timezone: z.string().nullable(),
  createdAt: isoDateSchema,
});

export const adminUserSchema = selfUserSchema.omit({ username: true, timezone: true }).extend({
  banned: z.boolean(),
  banReason: z.string().nullable(),
  banExpires: isoDateSchema.nullable(),
  updatedAt: isoDateSchema,
});

export const todoSchema = z.object({
  id: z.string(),
  content: z.string(),
  completedAt: isoDateSchema.nullable(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const bootstrapSchema = z.object({
  app: z.object({
    name: z.string(),
    version: z.string(),
    environment: z.enum(["development", "production", "test"]),
    runtime: z.enum(["node", "cloudflare"]),
  }),
  user: selfUserSchema.nullable(),
  preferences: z.object({
    theme: z.enum(["light", "dark", "system"]),
    timezone: z.string(),
  }),
  capabilities: z.object({
    oauthProviders: z.array(z.enum(["github", "google"])),
    uploads: z.boolean(),
  }),
});

type SessionUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  role?: string | null;
  username?: string | null;
  timezone?: string | null;
  createdAt: Date;
};

type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: string | null;
  banned: boolean | null;
  banReason: string | null;
  banExpires: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type TodoRow = {
  id: string;
  content: string;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function normalizedRole(role: string | null | undefined): "admin" | "user" {
  return role === "admin" ? "admin" : "user";
}

export function toSelfUser(user: SessionUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    image: user.image ?? null,
    role: normalizedRole(user.role),
    username: user.username ?? null,
    timezone: user.timezone ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

export function toAdminUser(user: AdminUserRow) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    image: user.image,
    role: normalizedRole(user.role),
    banned: user.banned ?? false,
    banReason: user.banReason,
    banExpires: user.banExpires?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function toTodo(todo: TodoRow) {
  return {
    id: todo.id,
    content: todo.content,
    completedAt: todo.completedAt?.toISOString() ?? null,
    createdAt: todo.createdAt.toISOString(),
    updatedAt: todo.updatedAt.toISOString(),
  };
}
