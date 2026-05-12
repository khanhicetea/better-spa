import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
    CamelCasePlugin,
    FileMigrationProvider,
    Kysely,
    Migrator,
    PostgresDialect,
} from "kysely";
import pg from "pg";
import type { Database } from "@/server/db/schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL is required");
}

const db = new Kysely<Database>({
    dialect: new PostgresDialect({
        pool: new pg.Pool({
            connectionString,
            max: parseInt(process.env.DATABASE_MAX_CONNECTIONS || "2", 10),
        }),
    }),
    plugins: [
        new CamelCasePlugin({
            maintainNestedObjectKeys: true,
        }),
    ],
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationFolder = path.join(__dirname, "migrations");

const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
        fs: {
            readdir,
        },
        path,
        migrationFolder,
    }),
});

const { error, results } = await migrator.migrateToLatest();

for (const result of results ?? []) {
    if (result.status === "Success") {
        console.log(`migration "${result.migrationName}" was executed successfully`);
    } else if (result.status === "Error") {
        console.error(`migration "${result.migrationName}" failed`);
    }
}

await db.destroy();

if (error) {
    console.error("failed to run migrateToLatest");
    console.error(error);
    process.exit(1);
}

console.log("database migrations are up to date");
