# File Storage (S3 / better-upload)

**For Agents**: Read this doc when implementing file uploads or image handling.

---

## Schema Pattern

Always wrap file arrays in an object with `files` key for future extensibility:

```typescript
// Types, metadata key should be snake_case
export interface PublicS3File {
  key: string;
  metadata: {
    public_url: string;
  };
}

export interface PublicS3Files {
  files: PublicS3File[];
}

// Schema
import type { PublicS3File, PublicS3Files } from "@/lib/schemas/s3";
export interface ProductTable {
  id: string;
  name: string;
  images: PublicS3Files;  // NOT: images: PublicS3File[]
}

// Single file schema
import type { PublicS3File, PublicS3Files } from "@/lib/schemas/s3";
export interface BlogTable {
  id: string;
  title: string;
  cover: PublicS3File;
}
```

## Database Operations

```typescript
// Insert/Update for multiple files
await repos.product.insertReturn({
  name: "Product",
  images: { files: uploadedImages }  // Wrap in { files: [...] }
});

// Access
const firstImage = product.images.files[0];  // NOT: product.images[0]
const allImages = product.images.files;
```

## Server-Side Configuration

Server route is pre-configured at `src/routes/api/upload.$.ts`. Only separate upload routes if it is necessary and mentioned.

```typescript
import { useUploadFiles } from "@better-upload/client";
import type { PublicS3File } from "@/lib/schemas/s3";

function ImageUploader({ onUpload }: { onUpload: (files: PublicS3File[]) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadFiles, isUploading, progress } = useUploadFiles({
    api: "/api/upload",
    route: "images",
    onUploadComplete: ({ files }) => {
      const mappedFiles: PublicS3File[] = files.map((file) => ({
        key: file.objectInfo.key,
        metadata: {
          public_url: file.objectInfo.metadata.url,
        },
      }));
      setUploadedImages((prev) => [...prev, ...mappedFiles]);
      toast.success(`Successfully uploaded ${files.length} image(s)`);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
  });

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const result = await uploadFiles(files);
  };

  return (
    <div>
      <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleSelect} />
      {isUploading && <span>Uploading... {progress}%</span>}
    </div>
  );
}
```

### Single File Upload

Use `useUploadFile` (singular) for uploading a single file. The callback receives `{ file }` instead of `{ files }`:

```typescript
import { useUploadFile } from "@better-upload/client";
import type { PublicS3File } from "@/lib/schemas/s3";

function CoverImageUploader({ onUpload }: { onUpload: (file: PublicS3File) => void }) {
  const [coverImage, setCoverImage] = useState<PublicS3File | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadHook = useUploadFile({
    onUploadComplete: ({ file }) => {
      const s3File: PublicS3File = {
        key: file.objectInfo.key,
        metadata: {
          public_url: file.objectInfo.metadata.url,
        },
      };
      setCoverImage(s3File);
      toast.success("Cover image uploaded successfully");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (error) => {
      toast.error("Failed to upload image", {
        description: error.message,
      });
    },
  });

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadHook.upload(file);
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleSelect}
      />
      {uploadHook.isPending && <span>Uploading...</span>}
    </div>
  );
}
```

**Key differences from `useUploadFiles`:**
- `useUploadFile` - for single file uploads
- `useUploadFiles` - for multiple file uploads
- Callback: `onUploadComplete: ({ file }) => ...` vs `onUploadComplete: ({ files }) => ...`
- Hook returns: `upload(file)` function and `isPending` state

## Form Integration

```typescript
function ProductForm() {
  const [images, setImages] = useState<PublicS3File[]>([]);

  const createMutation = useMutation(
    orpc.product.create.mutationOptions({
      onSuccess: () => toast.success("Product created"),
    })
  );

  const handleSubmit = (data: FormData) => {
    createMutation.mutate({
      ...data,
      images: { files: images }  // Wrap before sending
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Other fields */}
      <ImageUploader onUpload={setImages} />
      <Button type="submit">Create</Button>
    </form>
  );
}
```

## Environment Variables

Required in `.env`:

```env
S3_BUCKET=your-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_ENDPOINT=https://s3.amazonaws.com  # or custom endpoint
S3_URL=https://s3.amazonaws.com  # or prefix public url for s3
```
