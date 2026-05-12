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
        tanstackStart(),
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
    build: {
        rollupOptions: {
            external: ["pg", "kysely"],
        },
    },
}));
