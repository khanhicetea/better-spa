import { getDatabasePooling } from "@better-spa/db/client";
import { getAuthConfig } from "./src/server";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run Better Auth CLI commands");
}

const auth = getAuthConfig({
  db: getDatabasePooling(databaseUrl),
  baseURL: process.env.VITE_BASE_URL,
});

export default auth;
