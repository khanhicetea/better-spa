export const IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

export type ImageContentType = (typeof IMAGE_CONTENT_TYPES)[number];

/** The complete JSON-safe value persisted for one uploaded file. */
export type StoredFile = Readonly<{
  bucket: string;
  key: string;
  filename: string;
  contentType: ImageContentType;
  size: number;
}>;

export type UploadedFileUrlResolver = (file: StoredFile) => string | Promise<string>;

/**
 * Runtime behavior around a StoredFile value.
 *
 * Persist and serialize the plain value returned by toJSON(), not the class instance.
 * URL resolution is injected so this browser-safe wrapper does not depend on S3 credentials
 * or a server runtime. Subclasses may add domain helpers or override url().
 */
export class UploadedFile implements StoredFile {
  readonly bucket: string;
  readonly key: string;
  readonly filename: string;
  readonly contentType: ImageContentType;
  readonly size: number;

  constructor(file: StoredFile) {
    this.bucket = file.bucket;
    this.key = file.key;
    this.filename = file.filename;
    this.contentType = file.contentType;
    this.size = file.size;
  }

  async url(resolve: UploadedFileUrlResolver): Promise<string> {
    return resolve(this.toJSON());
  }

  toJSON(): StoredFile {
    return {
      bucket: this.bucket,
      key: this.key,
      filename: this.filename,
      contentType: this.contentType,
      size: this.size,
    };
  }
}
