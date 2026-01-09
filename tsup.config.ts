import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/worker/runner.ts"],
  outDir: ".output/worker",
  format: ["esm"],
  target: "node20",
  clean: true,
  minify: true,
  splitting: false,
  sourcemap: true,
  dts: false,
  bundle: true,
  external: [], // Bundle all dependencies for standalone execution
  tsconfig: "./tsconfig.json",
});
