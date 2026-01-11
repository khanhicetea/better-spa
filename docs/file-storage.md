# File Storage (S3 / better-upload)

**For Agents**: Read this doc when implementing file uploads or image handling.

---

## Schema Pattern

Always wrap file arrays in an object with `files` key for future extensibility:

```typescript
// Types, metadata key should be snake_case
export interface S3File {
  key: string;
  metadata: {
    url: string;
  };
}

export interface S3Files {
  files: S3File[];
}

// Schema
import { S3File, S3Files } from "@/lib/types";
export interface ProductTable {
  id: string;
  name: string;
  images: S3Files;  // NOT: images: S3File[]
}

// Single file schema
import { S3File, S3Files } from "@/lib/types";
export interface BlogTable {
  id: string;
  title: string;
  cover: S3File;
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
import { S3File } from "@/lib/types";

function ImageUploader({ onUpload }: { onUpload: (files: S3File[]) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadFiles, isUploading, progress } = useUploadFiles({
    api: "/api/upload",
    route: "images",
    onUploadComplete: ({ files }) => {
      const mappedFiles: S3File[] = files.map((file) => ({
        key: file.objectInfo.key,
        metadata: {
          url: file.objectInfo.metadata.url,
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
import { S3File } from "@/lib/types";

function CoverImageUploader({ onUpload }: { onUpload: (file: S3File) => void }) {
  const [coverImage, setCoverImage] = useState<S3File | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadHook = useUploadFile({
    onUploadComplete: ({ file }) => {
      const s3File: S3File = {
        key: file.objectInfo.key,
        metadata: {
          url: file.objectInfo.metadata.url,
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
  const [images, setImages] = useState<S3File[]>([]);

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
