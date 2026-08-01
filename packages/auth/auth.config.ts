import { createNodeDatabaseResource } from "@kitkit/db/client";
import { getAuthConfig } from "./src/server";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required to run Better Auth CLI commands");

const database = createNodeDatabaseResource(databaseUrl);
process.once("beforeExit", () => void database.close());

export default getAuthConfig({ db: database.db, baseURL: process.env.VITE_BASE_URL });
