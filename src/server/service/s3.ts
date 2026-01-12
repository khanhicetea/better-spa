import { env } from "@/env/server";
import { custom } from "@better-upload/server/clients";
import { presignGetObject } from "@better-upload/server/helpers";
import type {
  PrivateS3File,
  PrivateS3Files,
  PrivateS3FileWithUrl,
  PrivateS3FilesWithUrls,
} from "@/lib/schemas/s3";

const DEFAULT_TTL = 3600; // 1 hour

export const s3Client = custom({
  host: env.S3_ENDPOINT || "",
  region: env.S3_REGION || "auto",
  accessKeyId: env.S3_ACCESS_KEY_ID || "",
  secretAccessKey: env.S3_SECRET_ACCESS_KEY || "",
});

/**
 * Generate a presigned URL for a private S3 file
 */
export async function getPresignedUrl(
  key: string,
  expiresIn: number = DEFAULT_TTL,
): Promise<string> {
  return presignGetObject(s3Client, {
    bucket: env.S3_BUCKET_NAME || "default-bucket",
    key,
    expiresIn,
  });
}

/**
 * Add presigned URLs to a single private S3 file
 */
export async function addPresignedUrlToFile(
  file: PrivateS3File,
  expiresIn: number = DEFAULT_TTL,
): Promise<PrivateS3FileWithUrl> {
  const url = await getPresignedUrl(file.key, expiresIn);
  return {
    key: file.key,
    url,
  };
}

/**
 * Add presigned URLs to multiple private S3 files
 */
export async function addPresignedUrlsToFiles(
  files: PrivateS3Files | null,
  expiresIn: number = DEFAULT_TTL,
): Promise<PrivateS3FilesWithUrls | null> {
  if (!files || !files.files.length) {
    return null;
  }

  const filesWithUrls = await Promise.all(
    files.files.map((file) => addPresignedUrlToFile(file, expiresIn)),
  );

  return { files: filesWithUrls };
}
