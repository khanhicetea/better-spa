import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth/minimal";
import { admin } from "better-auth/plugins/admin";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import type { DB } from "@kitkit/db/client";
import { schema } from "@kitkit/db/schema";
import { getAdminPluginConfig } from "./rbac";

export type AuthSocialProviderConfig = {
  clientId: string;
  clientSecret: string;
};

export type AuthOptions = {
  db: DB;
  baseURL?: string;
  socialProviders?: {
    github?: AuthSocialProviderConfig;
    google?: AuthSocialProviderConfig;
  };
};

export const getAuthConfig = (options: AuthOptions) =>
  betterAuth({
    baseURL: options.baseURL,
    telemetry: { enabled: false },
    database: drizzleAdapter(options.db, { provider: "pg", schema }),
    plugins: [admin(getAdminPluginConfig()), expo(), tanstackStartCookies()],
    trustedOrigins: [
      "kitkit://",
      "kitkit://*",
      ...(process.env.NODE_ENV === "development" ? ["exp://", "exp://**"] : []),
    ],
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
