import { createEnv } from "@t3-oss/env-core";
import * as z from "zod";

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_BASE_URL: z.url().default("http://localhost:3000"),
    VITE_AUTH_GITHUB_ENABLED: z.coerce.boolean().default(true),
    VITE_AUTH_GOOGLE_ENABLED: z.coerce.boolean().default(false),
  },
  runtimeEnv: import.meta.env,
});
