import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "drizzle-kit";

const envPath = fileURLToPath(new URL("../../.env", import.meta.url));
if (!process.env.DATABASE_URL && existsSync(envPath)) process.loadEnvFile(envPath);
const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  schemaFilter: ["public"],
  tablesFilter: ["user", "session", "account", "verification", "todo_item"],
  migrations: { schema: "drizzle", table: "__drizzle_migrations" },
  ...(databaseUrl ? { dbCredentials: { url: databaseUrl } } : {}),
});
