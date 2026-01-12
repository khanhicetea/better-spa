import { handleRequest, type Router, route } from "@better-upload/server";
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
