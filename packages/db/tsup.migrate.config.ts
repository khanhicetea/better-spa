import { readdirSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "tsup";

const migrationDir = "src/migrations";
const migrationEntries = Object.fromEntries(
  readdirSync(migrationDir)
    .filter((file) => file.endsWith(".ts"))
    .map((file) => {
      const name = file.replace(/\.ts$/, "");
      return [`migrations/${name}`, path.join(migrationDir, file)];
    }),
);

export default defineConfig({
  entry: {
    index: "src/migrate.ts",
    ...migrationEntries,
  },
  format: ["esm"],
  outDir: "dist/migrate",
  target: "node24",
  platform: "node",
  splitting: false,
  sourcemap: false,
  clean: true,
  dts: false,
  outExtension() {
    return { js: ".mjs" };
  },
});
