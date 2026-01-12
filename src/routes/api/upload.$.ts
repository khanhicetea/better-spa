import { handleRequest, type Router, route } from "@better-upload/server";
import { presignGetObject } from "@better-upload/server/helpers";
import { createFileRoute } from "@tanstack/react-router";
import { env } from "@/env/server";
import { generateUUID, getFileExtFromMimeType } from "@/lib/helpers/data";
import { s3Client } from "@/server/service/s3";

const uploadRouter: Router = {
  client: s3Client,
  bucketName: env.S3_BUCKET_NAME || "default-bucket",
  routes: {
    images: route({
      fileTypes: ["image/*"],
      multipleFiles: true,
      maxFiles: 10,
      maxFileSize: 1024 * 1024 * 10, // 10MB
      onBeforeUpload: async () => {
        return {
          generateObjectInfo: async ({ file }) => {
            const key = `images/${generateUUID()}.${getFileExtFromMimeType(file.type)}`;
            return {
              key,
              metadata: {
                url: `${env.S3_URL}/${key}`,
                bucket_name: env.S3_BUCKET_NAME || "default-bucket",
              },
              cacheControl: "max-age=31536000; public; immutable",
            };
          },
        };
      },
    }),
    // Private images with private ACL and presigned URLs
    private_images: route({
      fileTypes: ["image/*"],
      multipleFiles: true,
      maxFiles: 10,
      maxFileSize: 1024 * 1024 * 10, // 10MB
      onBeforeUpload: async () => {
        return {
          generateObjectInfo: async ({ file }) => {
            const key = `private/${generateUUID()}.${getFileExtFromMimeType(file.type)}`;
            // Generate presigned URL with TTL 3600 (1 hour)
            const publicUrl = await presignGetObject(s3Client, {
              bucket: env.S3_BUCKET_NAME || "default-bucket",
              key,
              expiresIn: 3600,
            });
            return {
              key,
              metadata: {
                url: publicUrl,
                bucket_name: env.S3_BUCKET_NAME || "default-bucket",
              },
              acl: "private",
            };
          },
        };
      },
    }),
  },
};

export const Route = createFileRoute("/api/upload/$")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        return handleRequest(request, uploadRouter);
      },
    },
  },
});
