import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { CamelCasePlugin } from "kysely";
import type { DB } from "@better-spa/db/client";
import { getAdminPluginConfig } from "./rbac";

export type AuthSocialProviderConfig = {
  clientId: string;
  clientSecret: string;
};

export type AuthOptions = {
  db: DB;
  socialProviders?: {
    github?: AuthSocialProviderConfig;
    google?: AuthSocialProviderConfig;
  };
};

export const getAuthConfig = (options: AuthOptions) =>
  betterAuth({
    telemetry: { enabled: false },
    database: {
      db: options.db.withoutPlugins().withPlugin(new CamelCasePlugin()),
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
      ...(options.socialProviders?.github ? { github: options.socialProviders.github } : {}),
      ...(options.socialProviders?.google ? { google: options.socialProviders.google } : {}),
    },
    user: {
      additionalFields: {
        timezone: { type: "string", required: false },
        username: { type: "string", required: false, unique: true },
      },
    },
    emailAndPassword: { enabled: true },
  });

export type ServerAuth = ReturnType<typeof getAuthConfig>;
export type ServerAuthSession = Awaited<ReturnType<ServerAuth["api"]["getSession"]>>;
