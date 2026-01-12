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

// Private S3 files - only store key, presigned URLs generated on-demand
export const PrivateS3FileSchema = z.object({
  key: z.string().min(1).max(255),
});

export const PrivateS3FilesSchema = z.object({
  files: z.array(PrivateS3FileSchema),
});

export type PrivateS3File = z.infer<typeof PrivateS3FileSchema>;
export type PrivateS3Files = z.infer<typeof PrivateS3FilesSchema>;

// Response type with presigned URLs for displaying private files
export interface PrivateS3FileWithUrl {
  key: string;
  url: string; // Presigned URL with TTL
}

export interface PrivateS3FilesWithUrls {
  files: PrivateS3FileWithUrl[];
}
