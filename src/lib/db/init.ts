import { createServerOnlyFn } from "@tanstack/react-start";
import { CamelCasePlugin, Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import type { Database } from "./schema";

const { Pool } = pg;

export const getDatabasePooling = createServerOnlyFn(
  (connectionString: string) => {
    const pool = new Pool({
      connectionString,
      max: parseInt(process.env.DATABASE_MAX_CONNECTIONS || "2", 10),
    });
    return new Kysely<Database>({
      dialect: new PostgresDialect({ pool }),
      plugins: [new CamelCasePlugin()],
    });
  },
);

export const getDatabase = createServerOnlyFn((connectionString: string) => {
  return getDatabasePooling(connectionString);
});

export type DB = ReturnType<typeof getDatabase>;
