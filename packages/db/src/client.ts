import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import { user } from "./schema";

const { Client, Pool } = pg;
const MAX_CONNECTIONS = Number.parseInt(process.env.DATABASE_MAX_CONNECTIONS || "2", 10);

export type DB = NodePgDatabase;
export type DatabaseResource = { db: DB; close: () => Promise<void> };

declare global {
  // eslint-disable-next-line no-var
  var __databaseResource: DatabaseResource | undefined;
}

export function createNodeDatabaseResource(connectionString: string): DatabaseResource {
  const pool = new Pool({
    connectionString,
    max: MAX_CONNECTIONS,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    application_name: "kitkit",
  });
  return { db: drizzle({ client: pool }), close: () => pool.end() };
}

export function getNodeDatabaseResource(connectionString: string): DatabaseResource {
  if (!globalThis.__databaseResource) {
    globalThis.__databaseResource = createNodeDatabaseResource(connectionString);
  }
  return globalThis.__databaseResource;
}

export async function createWorkerDatabaseResource(
  connectionString: string,
): Promise<DatabaseResource> {
  const client = new Client({ connectionString });
  await client.connect();
  return { db: drizzle({ client }), close: () => client.end() };
}

export async function checkDatabaseReady(db: DB): Promise<void> {
  await db.select({ id: user.id }).from(user).limit(0);
}
