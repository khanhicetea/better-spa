import z from "zod";

export const S3ObjectKeySchema = z.string().min(1).max(1024);
export const S3BucketNameSchema = z.string().min(1).max(255);

export const StoredS3FileSchema = z.object({
  key: S3ObjectKeySchema,
  bucket: S3BucketNameSchema.optional(),
  filename: z.string().min(1).max(255).optional(),
  contentType: z.string().min(1).max(255).optional(),
  size: z.number().int().nonnegative().optional(),
});

const createS3FilesSchema = <TFile extends z.ZodTypeAny>(fileSchema: TFile) =>
  z.object({
    files: z.array(fileSchema),
  });

const ModernPublicS3FileSchema = StoredS3FileSchema.extend({
  url: z.url(),
});

const LegacyPublicS3FileSchema = StoredS3FileSchema.extend({
  metadata: z.object({
    public_url: z.url(),
  }),
}).transform(({ metadata, ...file }) => ({
  ...file,
  url: metadata.public_url,
}));

export const PublicS3FileSchema = z.union([
  ModernPublicS3FileSchema,
  LegacyPublicS3FileSchema,
]);

export const PublicS3FilesSchema = createS3FilesSchema(PublicS3FileSchema);

export type PublicS3File = z.infer<typeof PublicS3FileSchema>;
export type PublicS3Files = z.infer<typeof PublicS3FilesSchema>;

export const PrivateS3FileSchema = StoredS3FileSchema;

export const PrivateS3FilesSchema = createS3FilesSchema(PrivateS3FileSchema);

export type PrivateS3File = z.infer<typeof PrivateS3FileSchema>;
export type PrivateS3Files = z.infer<typeof PrivateS3FilesSchema>;

export const PrivateS3FileWithUrlSchema = PrivateS3FileSchema.extend({
  url: z.url(),
  expiresAt: z.iso.datetime(),
});

export const PrivateS3FilesWithUrlsSchema = createS3FilesSchema(
  PrivateS3FileWithUrlSchema,
);

export type PrivateS3FileWithUrl = z.infer<typeof PrivateS3FileWithUrlSchema>;
export type PrivateS3FilesWithUrls = z.infer<
  typeof PrivateS3FilesWithUrlsSchema
>;
