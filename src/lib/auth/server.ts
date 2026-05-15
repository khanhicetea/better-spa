import "@tanstack/react-start/server-only";
import { createServerOnlyFn } from "@tanstack/react-start";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { CamelCasePlugin } from "kysely";
import { env } from "@/env/server";
import type { DB } from "@/server/db/client";
import { getDatabase } from "@/server/db/client";
import { getAdminPluginConfig } from "./rbac";

// --- Auth config factory (server-only) ---

export const getAuthConfig = createServerOnlyFn((db: DB) =>
  betterAuth({
    telemetry: {
      enabled: false,
    },
    database: {
      db: db.withoutPlugins().withPlugin(new CamelCasePlugin()),
      type: "postgres",
      casing: "camel",
    },
    plugins: [admin(getAdminPluginConfig()), tanstackStartCookies()],

    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
    },

    socialProviders: {
      ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
        ? {
            github: {
              clientId: env.GITHUB_CLIENT_ID,
              clientSecret: env.GITHUB_CLIENT_SECRET,
            },
          }
        : {}),
      ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
            },
          }
        : {}),
    },

    user: {
      additionalFields: {
        timezone: {
          type: "string",
          required: false,
        },
        username: {
          type: "string",
          required: false,
          unique: true,
        },
      },
    },

    emailAndPassword: {
      enabled: true,
    },
  }),
);

// --- Singleton (consume via server context / node-server) ---

export const auth = getAuthConfig(getDatabase(process.env.DATABASE_URL!));

// --- Types ---

export type ServerAuth = ReturnType<typeof getAuthConfig>;
export type ServerAuthSession = Awaited<
  ReturnType<ServerAuth["api"]["getSession"]>
>;
