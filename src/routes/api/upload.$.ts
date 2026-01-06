import { handleRequest, type Router, route } from "@better-upload/server";
import { custom } from "@better-upload/server/clients";
import { createFileRoute } from "@tanstack/react-router";
import { env } from "@/env/server";
import { generateUUID, getFileExtFromMimeType } from "@/lib/helpers/data";

const uploadRouter: Router = {
  client: custom({
    host: env.S3_ENDPOINT || "",
    region: env.S3_REGION || "auto",
    accessKeyId: env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: env.S3_SECRET_ACCESS_KEY || "",
  }),
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
