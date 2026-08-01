import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import evlog from "evlog/nitro/v3";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import { evlogRedactConfig } from "@kitkit/observability";

export default defineConfig(({ command }) => ({
  resolve: {
    tsconfigPaths: true,
  },
  ssr: {
    external: ["pg"],
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
          specifiers: ["pg", "drizzle-orm", "better-auth/node"],
        },
      },
    }),
    // https://tanstack.com/start/latest/docs/framework/react/guide/hosting
    nitro({
      preset: "node-server",
      modules: [
        evlog({
          env: { service: "kitkit-web" },
          exclude: ["/api/rpc", "/api/rpc/**"],
          redact: evlogRedactConfig,
        }),
      ],
      rollupConfig: {
        external: ["pg"],
      },
      experimental: {
        asyncContext: true,
        ...(command === "build"
          ? {
              vite: {
                serverReload: true,
              },
            }
          : {}),
      },
    }),
    babel({
      presets: [reactCompilerPreset()],
    }),
    react(),
    tailwindcss(),
  ],
  server: {
    host: process.env.HOST,
    allowedHosts: [],
  },
}));
