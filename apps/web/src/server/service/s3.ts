import { env } from "@/env/server";
import type {
  PrivateS3File,
  PrivateS3Files,
  PrivateS3FileWithUrl,
  PrivateS3FilesWithUrls,
} from "@better-spa/shared/schemas/s3";
import { custom } from "@better-upload/server/clients";
import { presignGetObject } from "@better-upload/server/helpers";

export const DEFAULT_PRESIGNED_READ_TTL_SECONDS = 3600;

type S3ReadUrlOptions = {
  bucket?: string;
  expiresIn?: number;
};

let cachedS3Client: ReturnType<typeof custom> | null = null;

function getRequiredConfigValue(
  key: "S3_ACCESS_KEY_ID" | "S3_BUCKET_NAME" | "S3_ENDPOINT" | "S3_SECRET_ACCESS_KEY" | "S3_URL",
): string {
  const value = env[key];
  if (!value) {
    throw new Error(`Missing ${key}. Configure S3 before using file upload or download helpers.`);
  }

  return value;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function getExpiresIn(expiresIn?: number): number {
  return expiresIn ?? DEFAULT_PRESIGNED_READ_TTL_SECONDS;
}

function getExpiresAt(expiresIn: number): string {
  return new Date(Date.now() + expiresIn * 1000).toISOString();
}

export function getDefaultS3BucketName(): string {
  return getRequiredConfigValue("S3_BUCKET_NAME");
}

export function getS3Client() {
  if (cachedS3Client) {
    return cachedS3Client;
  }

  cachedS3Client = custom({
    host: getRequiredConfigValue("S3_ENDPOINT"),
    region: env.S3_REGION ?? "auto",
    accessKeyId: getRequiredConfigValue("S3_ACCESS_KEY_ID"),
    secretAccessKey: getRequiredConfigValue("S3_SECRET_ACCESS_KEY"),
  });

  return cachedS3Client;
}

export function buildPublicS3Url(key: string): string {
  return new URL(key, ensureTrailingSlash(getRequiredConfigValue("S3_URL"))).toString();
}

/**
 * Generate a presigned read URL and expiry for a private S3 object.
 */
export async function getPresignedReadUrl(
  key: string,
  options: S3ReadUrlOptions = {},
): Promise<Pick<PrivateS3FileWithUrl, "expiresAt" | "url">> {
  const expiresIn = getExpiresIn(options.expiresIn);

  return {
    url: await presignGetObject(getS3Client(), {
      bucket: options.bucket ?? getDefaultS3BucketName(),
      key,
      expiresIn,
    }),
    expiresAt: getExpiresAt(expiresIn),
  };
}

/**
 * Backward-compatible helper when only the URL string is needed.
 */
export async function getPresignedUrl(
  key: string,
  expiresIn: number = DEFAULT_PRESIGNED_READ_TTL_SECONDS,
): Promise<string> {
  const result = await getPresignedReadUrl(key, { expiresIn });
  return result.url;
}

/**
 * Resolve a private S3 file into a UI-ready object with a read URL.
 */
export async function resolvePrivateS3File(
  file: PrivateS3File,
  options: S3ReadUrlOptions = {},
): Promise<PrivateS3FileWithUrl> {
  const bucket = file.bucket ?? options.bucket ?? getDefaultS3BucketName();
  const { url, expiresAt } = await getPresignedReadUrl(file.key, {
    bucket,
    expiresIn: options.expiresIn,
  });

  return {
    ...file,
    bucket,
    url,
    expiresAt,
  };
}

/**
 * Backward-compatible alias for callers still using the older name.
 */
export async function addPresignedUrlToFile(
  file: PrivateS3File,
  expiresIn: number = DEFAULT_PRESIGNED_READ_TTL_SECONDS,
): Promise<PrivateS3FileWithUrl> {
  return resolvePrivateS3File(file, { expiresIn });
}

/**
 * Resolve a list of private S3 files into UI-ready objects with read URLs.
 */
export async function resolvePrivateS3Files(
  files: PrivateS3Files | null,
  options: S3ReadUrlOptions = {},
): Promise<PrivateS3FilesWithUrls | null> {
  if (!files?.files.length) {
    return null;
  }

  const filesWithUrls = await Promise.all(
    files.files.map((file) => resolvePrivateS3File(file, options)),
  );

  return { files: filesWithUrls };
}

/**
 * Backward-compatible alias for callers still using the older name.
 */
export async function addPresignedUrlsToFiles(
  files: PrivateS3Files | null,
  expiresIn: number = DEFAULT_PRESIGNED_READ_TTL_SECONDS,
): Promise<PrivateS3FilesWithUrls | null> {
  return resolvePrivateS3Files(files, { expiresIn });
}
