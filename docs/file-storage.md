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

## Persistence convention

The storage object is identified by `(bucket, key)`. Persist that identity and descriptive
metadata; never persist `uploadUrl`, `expiresAt`, a presigned read URL, or an endpoint-derived
URL. URLs are delivery details and either expire or change when storage/CDN configuration
changes.

Use these properties for every claimed upload:

| Property      | Required | Meaning                                      |
| ------------- | -------- | -------------------------------------------- |
| `bucket`      | yes      | Logical bucket returned by the upload intent |
| `key`         | yes      | Generated object key; never a client path    |
| `filename`    | yes      | Original display/download filename           |
| `contentType` | yes      | Validated media type used for the upload     |
| `size`        | yes      | Validated byte count                         |

Application tables may add domain metadata such as caption, alt text, sort order, or
`createdAt`. Do not add a `url`, `publicUrl`, or `privateUrl` column. This starter uses only a
private bucket. If a feature later exposes a file publicly, keep `(bucket, key)` as the stored
identity and derive its delivery URL at the server/CDN boundary; model visibility separately
only when the product has an actual visibility policy.

Treat all five storage properties as one value: they are either all present or all absent.
The upload-intent response is the source of the values, but the claiming application mutation
must still validate the configured bucket, the authenticated user's key prefix, allowed
content type, filename length, and size. A presigned `PUT` succeeding in the browser does not
by itself create or authorize an application record.

### Atomic file shape

One logical file field is always one atomic `StoredFile` JSON object containing the complete
persisted shape: `bucket`, `key`, `filename`, `contentType`, and `size`. This object is the
unit read, validated, written, replaced, and removed by application code.

Where that object is stored depends on the domain model. It may be the value of a single
JSONB column, an element in an array stored in JSONB, or a nested property inside a larger
JSONB document. A separate child row may also contain it when the domain needs independent
querying or lifecycle. In every representation, each logical file remains one complete
object with the same shape.

Spreading one file's properties across columns such as `avatarKey`, `avatarFilename`, and
`avatarSize` is an anti-pattern. So is storing a bare key in one location and its metadata in
another. Do not make storage shape depend on whether the containing field is singular,
plural, or nested. Validate the complete object at every write boundary.

`@better-spa/shared/files` owns the browser-safe `StoredFile` shape and `UploadedFile`
runtime wrapper. Persist and send only the plain `StoredFile` value; class instances are
rehydrated only when behavior is useful. `UploadedFile.url(resolver)` receives URL behavior
through dependency injection, so signing and authorization remain in the server storage
layer. The class may be subclassed for domain helpers, but helpers must not change its JSON
shape or bypass authorized URL resolution.

### Claiming and lifecycle

1. Request an upload intent and upload using its exact `Content-Type`.
2. Submit the returned stable metadata to the feature's application mutation.
3. In that mutation, validate ownership and persist the parent/file rows atomically.
4. Resolve private display/download access with `file.createReadUrl` only when needed.
5. On replacement or deletion, remove the database reference first; delete the object only
   after no references remain. Until durable deletion/reconciliation exists, rely on the
   bucket lifecycle policy for abandoned objects.

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
