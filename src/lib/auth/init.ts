import { createServerOnlyFn } from "@tanstack/react-start";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { CamelCasePlugin } from "kysely";
import type { DB } from "@/server/db/init";
import { ac, admin as adminRole, user as userRole } from "./permissions";

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
    plugins: [
      tanstackStartCookies(),
      admin({
        ac: ac as any,
        roles: {
          admin: adminRole as any,
          user: userRole as any,
        },
      }),
    ],

    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
    },

    socialProviders: {},

    emailAndPassword: {
      enabled: true,
    },
  }),
);

export type ServerAuth = ReturnType<typeof getAuthConfig>;
export type ServerAuthSession = Awaited<
  ReturnType<ServerAuth["api"]["getSession"]>
>;
