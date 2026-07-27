# Private File Storage

The application supports private image uploads through authenticated oRPC intents. There
is no upload HTTP router, public upload mode, durable public URL, or Better Upload client.

## RPC flow

1. Call `file.createUploadIntents` with 1–10 file descriptors.
2. For each returned intent, `PUT` the file to `uploadUrl` using the exact declared
   `Content-Type`.
3. Persist only stable metadata such as key, bucket, filename, content type, and size
   through an application RPC mutation.
4. Call `file.createReadUrl` when the UI needs a one-hour private read URL.

Upload intents expire after 10 minutes. Each file must be at most 10 MiB and one of:

- `image/jpeg`
- `image/png`
- `image/webp`
- `image/gif`

Keys are generated as `users/{userId}/images/{uuid}.{ext}`. Read requests reject anonymous
callers and keys outside the authenticated user's prefix. The signer in
`packages/rpc/src/storage.ts` works with S3-compatible path-style endpoints, including
Cloudflare R2's S3 API.

## Configuration

All values must be present to enable `bootstrap.capabilities.uploads`:

- `S3_ENDPOINT`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_BUCKET_NAME`
- `S3_REGION` (`auto` for R2)

There is intentionally no `S3_URL`; clients never construct durable object URLs.

## Bucket policy and CORS

Keep the bucket private. Do not enable anonymous object reads or public development
exceptions.

Configure bucket CORS for each trusted app origin. A minimal policy should allow:

- method: `PUT`
- origin: the exact web origin
- request header: `Content-Type`
- any response headers the client must inspect

Do not use `*` origins with authenticated application deployments. The signed request binds
the declared content type, so the upload must send the same value.

## Abuse and cleanup

Node applies a stricter per-user upload-intent rate policy. Cloudflare deployments must
enforce equivalent upload and admin policies at ingress because isolate-local mutable
state is not authoritative.

An upload intent does not prove the object was claimed by application data. Configure an
object-store lifecycle rule to remove old objects under `users/` that remain unclaimed,
or add a scheduled reconciliation workflow when the product begins persisting upload
metadata. Do not use `waitUntil` as a durable cleanup system.
