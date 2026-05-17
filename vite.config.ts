import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    devtools(),
    tanstackStart({
      importProtection: {
        // Fail fast in dev instead of silently mocking server imports
        behavior: {
          dev: "error",
          build: "error",
        },
        client: {
          // Block the entire server directory from ever reaching the client bundle
          files: ["**/src/server/**"],
          // Block server-only npm packages from leaking into the client
          specifiers: ["pg", "kysely", "better-auth/node"],
        },
      },
    }),
    // https://tanstack.com/start/latest/docs/framework/react/guide/hosting
    nitro({
      preset: process.env.NITRO_PRESET || undefined,
      ...(command === "build"
        ? {
            scanDirs: ["src/nitro"],
            experimental: {
              tasks: true,
              vite: {
                serverReload: true,
              },
            },
          }
        : {}),
    }),
    babel({
      presets: [reactCompilerPreset()],
    }),
    react(),
    tailwindcss(),
  ],
}));
