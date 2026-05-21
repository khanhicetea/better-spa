import { handleRequest, type Router, route } from "@better-upload/server";
import { createFileRoute } from "@tanstack/react-router";
import { generateUUID, getFileExtFromMimeType } from "@better-spa/shared/helpers/data";
import {
  buildPublicS3Url,
  getDefaultS3BucketName,
  getPresignedReadUrl,
  getS3Client,
} from "@/server/service/s3";


function createUploadRouter(): Router {
  const bucketName = getDefaultS3BucketName();

  return {
    client: getS3Client(),
    bucketName,
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
              const metadata = {
                url: buildPublicS3Url(key),
                bucket: bucketName,
                filename: file.name,
                size: file.size.toString(),
                ...(file.type ? { contentType: file.type } : {}),
              };

              return {
                key,
                metadata,
                cacheControl: "max-age=31536000; public; immutable",
              };
            },
          };
        },
      }),
      private_images: route({
        fileTypes: ["image/*"],
        multipleFiles: true,
        maxFiles: 10,
        maxFileSize: 1024 * 1024 * 10, // 10MB
        onBeforeUpload: async () => {
          return {
            generateObjectInfo: async ({ file }) => {
              const key = `private/${generateUUID()}.${getFileExtFromMimeType(file.type)}`;
              const { url, expiresAt } = await getPresignedReadUrl(key, {
                bucket: bucketName,
              });
              const metadata = {
                url,
                expiresAt,
                bucket: bucketName,
                filename: file.name,
                size: file.size.toString(),
                ...(file.type ? { contentType: file.type } : {}),
              };

              return {
                key,
                metadata,
                acl: "private",
              };
            },
          };
        },
      }),
    },
  };
}

export const Route = createFileRoute("/api/upload/$")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        return handleRequest(request, createUploadRouter());
      },
    },
  },
});
