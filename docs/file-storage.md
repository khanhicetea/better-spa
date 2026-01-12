# File Storage (S3 / better-upload)

**For Agents**: Read this doc when implementing file uploads or image handling.

---

## Quick Decision Guide

| Use Case                                       | ACL       | Schema Type     | When to Use                                      |
| ---------------------------------------------- | --------- | --------------- | ------------------------------------------------ |
| Public images (blog covers, avatars)           | `public`  | `PublicS3File`  | Files can be publicly accessed via URL           |
| Private files (user documents, product images) | `private` | `PrivateS3File` | Files require authentication, use presigned URLs |

---

## Schema Types

All types are defined in `@/lib/schemas/s3`:

```typescript
// PUBLIC S3 Files - direct URL access
export interface PublicS3File {
  key: string;
  metadata: {
    public_url: string;
  };
}

export interface PublicS3Files {
  files: PublicS3File[];
}

// PRIVATE S3 Files - presigned URL access (recommended for user data)
export interface PrivateS3File {
  key: string; // Only store the key, no URL
}

export interface PrivateS3Files {
  files: PrivateS3File[];
}

// Response type with presigned URLs for displaying private files
export interface PrivateS3FileWithUrl {
  key: string;
  url: string; // Presigned URL with TTL
}

export interface PrivateS3FilesWithUrls {
  files: PrivateS3FileWithUrl[];
}
```

**Important**: Always wrap file arrays in an object with `files` key for future extensibility.

---

## Private S3 Files (Recommended for User Data)

Use private ACL for user-specific files that should require authentication. Presigned URLs are generated on-demand with TTL.

### 1. Database Schema

```typescript
// src/server/db/schema/product.ts
import type { PrivateS3Files } from "@/lib/schemas/s3";

export interface ProductTable {
  id: Generated<string>;
  userId: string;
  name: string;
  images: PrivateS3Files | null; // Store only keys, generate URLs on access
  createdAt: ColumnType<Date, Date | undefined, never>;
  updatedAt: Date;
}
```

### 2. Upload Route Configuration

Add a route in `src/routes/api/upload.$.ts` with `acl: "private"`:

```typescript
import { handleRequest, type Router, route } from "@better-upload/server";
import { presignGetObject } from "@better-upload/server/helpers";
import { env } from "@/env/server";
import { generateUUID, getFileExtFromMimeType } from "@/lib/helpers/data";
import { s3Client } from "@/server/service/s3";

const uploadRouter: Router = {
  client: s3Client,
  bucketName: env.S3_BUCKET_NAME || "default-bucket",
  routes: {
    // Private images with presigned URLs
    "product-images": route({
      fileTypes: ["image/*"],
      multipleFiles: true,
      maxFiles: 10,
      maxFileSize: 1024 * 1024 * 10, // 10MB
      onBeforeUpload: async () => {
        return {
          generateObjectInfo: async ({ file }) => {
            const key = `products/${generateUUID()}.${getFileExtFromMimeType(file.type)}`;
            // Generate presigned URL with TTL 3600 (1 hour)
            const publicUrl = await presignGetObject(s3Client, {
              bucket: env.S3_BUCKET_NAME || "default-bucket",
              key,
              expiresIn: 3600,
            });
            return {
              key,
              metadata: {
                url: publicUrl, // Returned to client for immediate display
                bucket_name: env.S3_BUCKET_NAME || "default-bucket",
              },
              acl: "private", // IMPORTANT: Set to private
            };
          },
        };
      },
    }),
  },
};
```

### 3. Presigned URL Utility

Use `src/server/service/s3.ts` for generating presigned URLs:

```typescript
import { presignGetObject } from "@better-upload/server/helpers";
import { env } from "@/env/server";
import type { PrivateS3Files, PrivateS3FilesWithUrls } from "@/lib/schemas/s3";
import { s3Client } from "./s3";

const DEFAULT_TTL = 3600; // 1 hour

export async function getPresignedUrl(
  key: string,
  expiresIn = DEFAULT_TTL,
): Promise<string> {
  return presignGetObject(s3Client, {
    bucket: env.S3_BUCKET_NAME || "default-bucket",
    key,
    expiresIn,
  });
}

export async function addPresignedUrlsToFiles(
  files: PrivateS3Files | null,
  expiresIn = DEFAULT_TTL,
): Promise<PrivateS3FilesWithUrls | null> {
  if (!files || !files.files.length) return null;

  const filesWithUrls = await Promise.all(
    files.files.map(async (file) => ({
      key: file.key,
      url: await getPresignedUrl(file.key, expiresIn),
    })),
  );

  return { files: filesWithUrls };
}
```

### 4. RPC Handler Pattern

Add presigned URLs when returning data to frontend:

```typescript
// src/rpc/handlers/product.ts
import { addPresignedUrlsToFiles } from "@/server/service/s3";

export const listProducts = authedProcedure
  .input(z.object({ page: z.number().min(1).default(1) }))
  .handler(async ({ input, context }) => {
    const result = await context.repos.product.findPaginated({
      page: input.page,
      pageSize: 20,
      where: { userId: context.user.id },
    });

    // Add presigned URLs to images
    const itemsWithUrls = await Promise.all(
      result.items.map(async (product) => ({
        ...product,
        imagesWithUrls: await addPresignedUrlsToFiles(product.images, 3600),
      })),
    );

    return { ...result, items: itemsWithUrls };
  });

export const createProduct = authedProcedure
  .input(
    z.object({
      name: z.string().min(1),
      images: PrivateS3FilesSchema.nullable().optional(),
    }),
  )
  .handler(async ({ input, context }) => {
    const newProduct = await context.repos.product.insertReturn({
      id: generateUUID(),
      userId: context.user.id,
      name: input.name,
      images: input.images ?? null, // Store only keys
    });

    return {
      ...newProduct,
      imagesWithUrls: await addPresignedUrlsToFiles(newProduct?.images, 3600),
    };
  });
```

### 5. Frontend Upload Component

```typescript
import { useUploadFiles } from "@better-upload/client";

interface UploadedImage {
  key: string;
  url: string;
}

function ProductImageUploader({ images, setImages }: {
  images: UploadedImage[];
  setImages: React.Dispatch<React.SetStateAction<UploadedImage[]>>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadHook = useUploadFiles({
    api: "/api/upload",
    route: "product-images",  // Use the private route
    onUploadComplete: ({ files }) => {
      const newImages = files.map((file) => ({
        key: file.objectInfo.key,
        url: file.objectInfo.metadata.url as string,  // Presigned URL from upload
      }));
      setImages((prev) => [...prev, ...newImages]);
      toast.success(`Uploaded ${files.length} image(s)`);
    },
    onUploadProgress: ({ file }) => {
      setUploadProgress(Math.round(file.progress * 100));
    },
    onError: (error) => {
      toast.error("Upload failed", { description: error.message });
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    await uploadHook.upload(files);
  };

  return (
    <div>
      <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleFileSelect} />
      {uploadHook.isPending && <Progress value={uploadProgress} />}
    </div>
  );
}
```

### 6. Submitting to RPC

Only send the keys to the server, not URLs:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  await createMutation.mutateAsync({
    name,
    images:
      images.length > 0
        ? { files: images.map((img) => ({ key: img.key })) } // Only keys
        : null,
  });
};
```

---

## Public S3 Files

Use for publicly accessible files (blog covers, marketing images) that don't require authentication.

### 1. Database Schema (Public)

```typescript
// src/server/db/schema/blog.ts
import type { PublicS3File, PublicS3Files } from "@/lib/schemas/s3";

export interface BlogPostTable {
  id: Generated<string>;
  userId: string;
  title: string;
  cover: PublicS3File | null; // Single public file
  images: PublicS3Files | null; // Multiple public files
  createdAt: ColumnType<Date, Date | undefined, never>;
  updatedAt: Date;
}
```

### 2. Upload Route Configuration (Public)

In `src/routes/api/upload.$.ts`:

```typescript
const uploadRouter: Router = {
  client: s3Client,
  bucketName: env.S3_BUCKET_NAME || "default-bucket",
  routes: {
    // Public images - direct URL access
    images: route({
      fileTypes: ["image/*"],
      multipleFiles: true,
      maxFiles: 10,
      maxFileSize: 1024 * 1024 * 10, // 10MB
      onBeforeUpload: async () => ({
        generateObjectInfo: async ({ file }) => {
          const key = `images/${generateUUID()}.${getFileExtFromMimeType(file.type)}`;
          return {
            key,
            metadata: {
              url: `${env.S3_URL}/${key}`, // Direct public URL
            },
            cacheControl: "max-age=31536000; public; immutable",
            // No acl needed - defaults to public
          };
        },
      }),
    }),
  },
};
```

### 3. RPC Handler Pattern (Public)

No presigned URL generation needed - just return the data directly:

```typescript
// src/rpc/handlers/blog.ts
export const listBlogPosts = authedProcedure
  .input(z.object({ page: z.number().min(1).default(1) }))
  .handler(async ({ input, context }) => {
    return context.repos.blogPost.findPaginated({
      page: input.page,
      pageSize: 20,
      where: { userId: context.user.id },
    });
    // No URL generation needed - cover.metadata.public_url is already stored
  });

export const createBlogPost = authedProcedure
  .input(
    z.object({
      title: z.string().min(1),
      cover: PublicS3FileSchema.nullable().optional(),
    }),
  )
  .handler(async ({ input, context }) => {
    return context.repos.blogPost.insertReturn({
      id: generateUUID(),
      userId: context.user.id,
      title: input.title,
      cover: input.cover ?? null, // Store the full object with URL
    });
  });
```

### 4. Frontend Upload Component (Public)

```typescript
import { useUploadFiles } from "@better-upload/client";
import type { PublicS3File } from "@/lib/schemas/s3";

function BlogImageUploader({ images, setImages }: {
  images: PublicS3File[];
  setImages: React.Dispatch<React.SetStateAction<PublicS3File[]>>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadHook = useUploadFiles({
    api: "/api/upload",
    route: "images",  // Public route
    onUploadComplete: ({ files }) => {
      const mappedFiles: PublicS3File[] = files.map((file) => ({
        key: file.objectInfo.key,
        metadata: {
          public_url: file.objectInfo.metadata.url as string,
        },
      }));
      setImages((prev) => [...prev, ...mappedFiles]);
      toast.success(`Uploaded ${files.length} image(s)`);
    },
    onUploadProgress: ({ file }) => {
      setUploadProgress(Math.round(file.progress * 100));
    },
    onError: (error) => {
      toast.error("Upload failed", { description: error.message });
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    await uploadHook.upload(files);
  };

  return (
    <div>
      <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleFileSelect} />
      {uploadHook.isPending && <Progress value={uploadProgress} />}
    </div>
  );
}
```

### 5. Submitting to RPC (Public)

Send the full object including metadata:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  await createMutation.mutateAsync({
    title,
    cover: selectedCover, // Full PublicS3File object with key + metadata
    images: images.length > 0 ? { files: images } : null,
  });
};
```

### 6. Displaying Images (Public)

Direct URL access from the stored metadata:

```tsx
// In your component
<img src={blogPost.cover?.metadata.public_url} alt={blogPost.title} />;

{
  blogPost.images?.files.map((image) => (
    <img key={image.key} src={image.metadata.public_url} alt="" />
  ));
}
```

---

## Single File Upload

Use `useUploadFile` (singular) for single file uploads:

```typescript
import { useUploadFile } from "@better-upload/client";

const uploadHook = useUploadFile({
  api: "/api/upload",
  route: "product-images",
  onUploadComplete: ({ file }) => {
    setCoverImage({
      key: file.objectInfo.key,
      url: file.objectInfo.metadata.url as string,
    });
  },
  onError: (error) => toast.error(error.message),
});

// Usage
uploadHook.upload(file);
uploadHook.isPending; // Loading state
```

---

## Available Upload Routes

| Route            | ACL     | Use Case                             |
| ---------------- | ------- | ------------------------------------ |
| `images`         | public  | Public images (blog covers)          |
| `product-images` | private | User product images (presigned URLs) |

To add a new route, modify `src/routes/api/upload.$.ts`.

---

## Environment Variables

Required in `.env`:

```env
S3_BUCKET_NAME=your-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_ENDPOINT=https://s3.amazonaws.com  # or custom endpoint
S3_URL=https://your-bucket.s3.amazonaws.com  # Public URL prefix (for public ACL only)
```

---

## Reference Implementation

See `src/routes/(user)/app/product.tsx` for a complete example of:

- Private S3 image uploads
- Presigned URL handling
- Drag-and-drop image reordering
- Form integration with RPC
