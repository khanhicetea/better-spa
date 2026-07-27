import "@tanstack/react-start/server-only";
import { createEnv } from "@t3-oss/env-core";
import * as z from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    VITE_BASE_URL: z.url().default("http://localhost:3000"),
    BETTER_AUTH_SECRET: z.string().min(1),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    CRON_SECRET: z.string().optional(),
    TRUST_PROXY: z.string().optional(),
    REQUEST_DEADLINE_MS: z.coerce.number().int().positive().default(30_000),
    API_BODY_LIMIT_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(1024 * 1024),
    S3_ENDPOINT: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_BUCKET_NAME: z.string().optional(),
    S3_REGION: z.string().optional(),
  },
  runtimeEnv: process.env,
});
