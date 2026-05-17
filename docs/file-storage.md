# File Storage

Rules for uploads and S3-backed metadata.

## Shapes

- Public file: `PublicS3File` or `PublicS3Files`
- Private file: `PrivateS3File` or `PrivateS3Files`
- Arrays are always wrapped as `{ files: [...] }`

Types live in `src/lib/schemas/s3.ts`.

## Live Upload Routes

`src/routes/api/upload.$.ts` exposes:

- `images`
- `private_images`

Both are image-only, up to 10 files, up to 10 MB each.

## Persistence Rule

Persist file metadata only.

- Good: `key`, `bucket`, `filename`, `contentType`, `size`, `url`
- Bad: browser `File` objects

For private files, persist stable metadata and generate read URLs when returning data to the client.

## Server Helpers

Use `src/server/service/s3.ts`:

- `buildPublicS3Url`
- `getPresignedReadUrl`
- `resolvePrivateS3File`
- `resolvePrivateS3Files`

## RPC and Frontend Pattern

- Validate incoming file metadata with the matching schema.
- Persist that serialized metadata through RPC.
- For private files, attach URLs in the RPC response.
- Upload from the client with `useUploadFiles` from `@better-upload/client`.

## Environment

Uploads depend on:

- `S3_ENDPOINT`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_BUCKET_NAME`
- `S3_REGION`
- `S3_URL`

If these are missing, treat upload helpers as unavailable.
