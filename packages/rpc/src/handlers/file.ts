import * as z from "zod";
import { authedProcedure } from "../base";
import { IMAGE_CONTENT_TYPES } from "../storage";

const imageContentTypeSchema = z.enum(IMAGE_CONTENT_TYPES);
const fileInputSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: imageContentTypeSchema,
  size: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024),
});

const uploadIntentSchema = fileInputSchema.extend({
  key: z.string(),
  bucket: z.string(),
  uploadUrl: z.url(),
  expiresAt: z.iso.datetime(),
});

export const createUploadIntents = authedProcedure
  .input(z.object({ files: z.array(fileInputSchema).min(1).max(10) }))
  .output(z.object({ files: z.array(uploadIntentSchema) }))
  .handler(async ({ context, input, errors }) => {
    if (!context.storage) throw errors.SERVICE_UNAVAILABLE();
    const limited = context.rateLimit.check("upload", context.user.id);
    if (!limited.allowed) {
      throw errors.RATE_LIMITED({ data: { retryAfter: limited.retryAfter } });
    }

    return {
      files: await Promise.all(
        input.files.map((file) => context.storage!.createUploadIntent(context.user.id, file)),
      ),
    };
  });

export const createReadUrl = authedProcedure
  .input(z.object({ key: z.string().min(1).max(1024) }))
  .output(z.object({ url: z.url(), expiresAt: z.iso.datetime() }))
  .handler(async ({ context, input, errors }) => {
    if (!context.storage) throw errors.SERVICE_UNAVAILABLE();
    if (!input.key.startsWith(`users/${context.user.id}/`) || input.key.includes("..")) {
      throw errors.FORBIDDEN();
    }
    return context.storage.createReadUrl(context.user.id, input.key);
  });
