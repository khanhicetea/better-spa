import { createServerOnlyFn } from "@tanstack/react-start";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { CamelCasePlugin } from "kysely";
import { env } from "@/env/server";
import type { DB } from "@/server/db/init";
import { getAdminPluginConfig } from "./permissions";

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
    plugins: [tanstackStartCookies(), admin(getAdminPluginConfig())],

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

    emailAndPassword: {
      enabled: true,
    },
  }),
);

export type ServerAuth = ReturnType<typeof getAuthConfig>;
export type ServerAuthSession = Awaited<
  ReturnType<ServerAuth["api"]["getSession"]>
>;
