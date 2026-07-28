import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const envPath = path.join(root, ".env");

if (existsSync(envPath)) {
  loadEnvFile(envPath);
}

const result = spawnSync("pnpm", ["dlx", "auth@1.7.0-rc.2", ...process.argv.slice(2)], {
  cwd: path.join(root, "packages/auth"),
  env: process.env,
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

process.exitCode = result.status ?? 1;
