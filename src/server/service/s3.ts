import { env } from "@/env/server";
import { custom } from "@better-upload/server/clients";

export const s3Client = custom({
  host: env.S3_ENDPOINT || "",
  region: env.S3_REGION || "auto",
  accessKeyId: env.S3_ACCESS_KEY_ID || "",
  secretAccessKey: env.S3_SECRET_ACCESS_KEY || "",
});
