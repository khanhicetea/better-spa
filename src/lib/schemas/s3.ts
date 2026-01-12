import z from "zod";

export const PublicS3FileSchema = z.object({
  key: z.string().min(1).max(255),
  metadata: z.object({
    public_url: z.url(),
  }),
});

export const PublicS3FilesSchema = z.object({
  files: z.array(PublicS3FileSchema),
});

export type PublicS3File = z.infer<typeof PublicS3FileSchema>;
export type PublicS3Files = z.infer<typeof PublicS3FilesSchema>;
