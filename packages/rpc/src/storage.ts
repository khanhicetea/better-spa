export const IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export type ImageContentType = (typeof IMAGE_CONTENT_TYPES)[number];

export type StorageObjectMetadata = {
  key: string;
  bucket: string;
  filename: string;
  contentType: ImageContentType;
  size: number;
};

export type UploadIntent = StorageObjectMetadata & {
  uploadUrl: string;
  expiresAt: string;
};

export type ReadIntent = {
  url: string;
  expiresAt: string;
};

export interface StorageSigner {
  bucket: string;
  createUploadIntent(
    userId: string,
    file: Omit<StorageObjectMetadata, "bucket" | "key">,
  ): Promise<UploadIntent>;
  createReadUrl(userId: string, key: string): Promise<ReadIntent>;
}

type S3SignerOptions = {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  uploadExpiresIn?: number;
};

const encoder = new TextEncoder();
const EXTENSIONS: Record<ImageContentType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function bytes(value: string): ArrayBuffer {
  return Uint8Array.from(encoder.encode(value)).buffer;
}

async function sha256(value: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", bytes(value)));
}

async function hmac(key: ArrayBuffer, value: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, bytes(value));
}

function encodePath(path: string): string {
  return path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function isoAmzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

async function createPresignedUrl(options: {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  key: string;
  method: "GET" | "PUT";
  expiresIn: number;
  contentType?: ImageContentType;
}): Promise<string> {
  const now = new Date();
  const amzDate = isoAmzDate(now);
  const date = amzDate.slice(0, 8);
  const scope = `${date}/${options.region}/s3/aws4_request`;
  const endpoint = new URL(options.endpoint);
  const path = `/${encodePath(options.bucket)}/${encodePath(options.key)}`;
  const signedHeaders = options.contentType ? "content-type;host" : "host";
  const canonicalHeaders = options.contentType
    ? `content-type:${options.contentType}\nhost:${endpoint.host}\n`
    : `host:${endpoint.host}\n`;

  const query = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${options.accessKeyId}/${scope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(options.expiresIn),
    "X-Amz-SignedHeaders": signedHeaders,
  });
  query.sort();

  const canonicalRequest = [
    options.method,
    path,
    query.toString(),
    canonicalHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, await sha256(canonicalRequest)].join(
    "\n",
  );
  const dateKey = await hmac(bytes(`AWS4${options.secretAccessKey}`), date);
  const regionKey = await hmac(dateKey, options.region);
  const serviceKey = await hmac(regionKey, "s3");
  const signingKey = await hmac(serviceKey, "aws4_request");
  const signature = toHex(await hmac(signingKey, stringToSign));

  return `${endpoint.origin}${path}?${query.toString()}&X-Amz-Signature=${signature}`;
}

export function createS3StorageSigner(options: S3SignerOptions): StorageSigner {
  const uploadExpiresIn = options.uploadExpiresIn ?? 10 * 60;

  return {
    bucket: options.bucket,
    async createUploadIntent(userId, file) {
      const key = `users/${userId}/images/${crypto.randomUUID()}.${EXTENSIONS[file.contentType]}`;
      return {
        ...file,
        key,
        bucket: options.bucket,
        uploadUrl: await createPresignedUrl({
          ...options,
          key,
          method: "PUT",
          expiresIn: uploadExpiresIn,
          contentType: file.contentType,
        }),
        expiresAt: new Date(Date.now() + uploadExpiresIn * 1000).toISOString(),
      };
    },
    async createReadUrl(userId, key) {
      const prefix = `users/${userId}/`;
      if (!key.startsWith(prefix) || key.includes("..")) {
        throw new Error("Storage key is outside the authenticated user's prefix");
      }

      const expiresIn = 60 * 60;
      return {
        url: await createPresignedUrl({
          ...options,
          key,
          method: "GET",
          expiresIn,
        }),
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      };
    },
  };
}
