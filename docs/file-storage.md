# File Storage (S3 / better-upload)

## Schema Pattern

Always wrap file arrays in an object with `files` key for future extensibility:

```typescript
// Types
export interface S3File {
  key: string;
  metadata: {
    url: string;
    bucketName: string;
  };
}

export interface ProductImages {
  files: S3File[];
}

// Schema
export interface ProductTable {
  id: string;
  name: string;
  images: ProductImages;  // NOT: images: S3File[]
}
```

## Database Operations

```typescript
// Insert/Update
await repos.product.insertReturn({
  name: "Product",
  images: { files: uploadedImages }  // Wrap in { files: [...] }
});

// Access
const firstImage = product.images.files[0];  // NOT: product.images[0]
const allImages = product.images.files;
```

## Client-Side Upload

Server route is pre-configured at `src/routes/api/upload.$.ts`.

```typescript
import { useUploadFiles } from "@better-upload/client";

function ImageUploader({ onUpload }: { onUpload: (files: S3File[]) => void }) {
  const { uploadFiles, isUploading, progress } = useUploadFiles({
    route: "images",
  });

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const result = await uploadFiles(files);
    if (result.success) {
      onUpload(result.files);
    }
  };

  return (
    <div>
      <input type="file" multiple accept="image/*" onChange={handleSelect} />
      {isUploading && <span>Uploading... {progress}%</span>}
    </div>
  );
}
```

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
```
