import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "tsup";

// Get the directory of this config file
const __dirname = dirname(fileURLToPath(import.meta.url));

// Read and parse package.json to get all dependencies
const packageJsonPath = resolve(__dirname, "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

// Extract all dependencies and devDependencies as external
const externalDeps = [...Object.keys(packageJson.dependencies || {})];

export default defineConfig({
  entry: ["src/server/worker/runner.ts"],
  outDir: ".output/worker",
  format: ["esm"],
  target: "node24", // Match project runtime
  clean: true,
  minify: true,
  splitting: false,
  sourcemap: false,
  dts: false,
  bundle: true,
  external: externalDeps,
  tsconfig: "./tsconfig.json",
});
