# File Storage

Compact reference for uploads and S3-backed file metadata.

## Choose the Right Shape

- Public file: use `PublicS3File` or `PublicS3Files`
- Private file: use `PrivateS3File` or `PrivateS3Files`
- Arrays are always wrapped as `{ files: [...] }`

Types live in `src/lib/schemas/s3.ts`.

## Live Upload Routes

`src/routes/api/upload.$.ts` currently exposes:

- `images`: public images
- `private_images`: private images with presigned read URLs

Both accept image uploads only, up to 10 files, up to 10 MB each.

## Persistence Rule

Persist file metadata only.

- Good: `key`, `bucket`, `filename`, `contentType`, `size`, `url`
- Bad: raw browser `File` objects

For private files, store only stable metadata and generate read URLs when returning data to the client.

## Server Helpers

Use `src/server/service/s3.ts`:

- `buildPublicS3Url(key)`
- `getPresignedReadUrl(key, options)`
- `resolvePrivateS3File(file, options)`
- `resolvePrivateS3Files(files, options)`

## RPC Pattern

- Validate incoming file metadata with the matching schema.
- Persist the metadata on create/update.
- For private files, attach URLs in the RPC response with `resolvePrivateS3Files`.

## Frontend Pattern

- Upload with `useUploadFiles` from `@better-upload/client`
- Convert the upload result into the serialized S3 metadata shape
- Submit that serialized metadata through RPC

## Environment

S3 helpers depend on these server env vars when uploads are used:

- `S3_ENDPOINT`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_BUCKET_NAME`
- `S3_REGION`
- `S3_URL`

If these are missing, upload and URL helpers should be treated as unavailable.
