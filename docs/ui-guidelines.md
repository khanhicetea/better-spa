# UI/UX Guidelines

**For Agents**:
- Read this doc when implementing any UI work (forms, dialogs, tables, layouts).
- Read the [React Conventions](react-conventions.md) doc for React conventions if you haven't already.

---

## CRITICAL: Base UI (NOT Radix)

This project uses **Base UI** (`@base-ui/react`), NOT Radix UI. The API is different.

### Render Prop Pattern (MUST USE)

```tsx
// WRONG - Radix asChild pattern (will NOT work)
<DialogTrigger asChild>
  <Button>Open</Button>
</DialogTrigger>

// CORRECT - Base UI render prop pattern
<DialogTrigger render={<Button />}>
  Open
</DialogTrigger>

// CORRECT - With additional props
<SheetTrigger render={<Button variant="outline" size="sm" />}>
  Add Item
</SheetTrigger>

// CORRECT - Icon button
<AlertDialogTrigger render={<Button variant="destructive" size="icon-sm" />}>
  <Trash2 />
</AlertDialogTrigger>
```

### Common Dialog/Sheet Patterns

```tsx
// Dialog with trigger
<Dialog>
  <DialogTrigger render={<Button>Open Dialog</Button>} />
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
    </DialogHeader>
    {/* Content */}
    <DialogFooter>
      <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
      <Button onClick={handleSubmit}>Submit</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

// AlertDialog for confirmations
<AlertDialog>
  <AlertDialogTrigger render={<Button variant="destructive" size="icon-sm" />}>
    <Trash2 />
  </AlertDialogTrigger>
  <AlertDialogContent size="sm">
    <AlertDialogHeader>
      <AlertDialogMedia><Trash2 className="text-destructive" /></AlertDialogMedia>
      <AlertDialogTitle>Delete Item</AlertDialogTitle>
      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
      <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={isPending}>
        {isPending ? "Deleting..." : "Delete"}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Styling

- Use **shadcn/ui** components with **Base UI** primitives
- Use **Tailwind CSS v4**
- Use theme color variables: `primary`, `secondary`, `muted`, `accent`, `destructive`
- **No specific colors** (e.g., `bg-blue-500`) without asking first
- UI should be responsive, compact, and clean

### Theme Colors

```tsx
// Backgrounds
bg-primary bg-secondary bg-muted bg-accent bg-destructive bg-background

// Foregrounds (text)
text-primary-foreground text-secondary-foreground text-muted-foreground
text-accent-foreground text-destructive-foreground text-foreground

// Borders
border-border border-primary border-destructive
```

---

## Icons

- Use **Lucide** icons for buttons
- If icon is universally recognized for its action, skip text label
- Examples: trash icon for delete, pencil for edit, plus for add

```tsx
import { Trash2, Pencil, Plus } from "lucide-react";

// Icon-only button
<Button variant="ghost" size="icon-sm"><Trash2 /></Button>

// Icon with text (use data-icon attribute for proper spacing)
<Button><Plus data-icon="inline-start" />Add Item</Button>
<Button>Save<Check data-icon="inline-end" /></Button>
```

---

## Forms

- Form fields must have **label** and **error message**
- Use vertical layout with `space-y-4`
- Use `react-hook-form` with shadcn/ui components

```tsx
<form className="space-y-4">
  <div className="space-y-2">
    <Label htmlFor="name">Name</Label>
    <Input id="name" {...register("name")} />
    {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
  </div>
</form>
```

See demo: `src/routes/(test)/hello-form.tsx`

---

## CRUD Operations

- **Add/Edit (1-3 fields)**: Use `Dialog` component
- **Add/Edit (4-5 fields)**: Use `Sheet` component
- **Add/Edit (6+ fields)**: Use separate page route
- **Delete/Confirm**: Use `AlertDialog` component

```tsx
// Dialog for create/edit (1-3 fields)
<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger render={<Button>Add Item</Button>} />
  <DialogContent showCloseButton={false}>
    <DialogHeader>
      <DialogTitle>Add Item</DialogTitle>
    </DialogHeader>
    {/* Form */}
    <DialogFooter>
      <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

// Sheet for create/edit (4-5 fields)
<Sheet open={open} onOpenChange={setOpen}>
  <SheetTrigger render={<Button>Add Item</Button>} />
  <SheetContent>
    <SheetHeader>
      <SheetTitle>Add Item</SheetTitle>
    </SheetHeader>
    {/* Form */}
  </SheetContent>
</Sheet>

// Use separate page route for 6+ fields
// Example: /product for listing, /product/form/[id] for create/edit
// id = empty ? new mode : edit mode
```

---

## Tables

- Use shadcn table for simple table without pagination
- Use **TanStack Table** with column definitions for more complex tables
- No sorting or column visibility toggles
- Row actions in last column with `justify-end`

```tsx
const columns: ColumnDef<Product>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "price", header: "Price" },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex justify-end gap-2">
        <EditButton item={row.original} />
        <DeleteButton id={row.original.id} />
      </div>
    ),
  },
];
```

---

## Empty States

Use the Empty component from `src/components/ui/empty.tsx`:

```tsx
import { Empty } from "@/components/ui/empty";

{items.length === 0 ? (
  <Empty
    icon={<Package className="h-12 w-12" />}
    title="No products"
    description="Create your first product to get started."
    action={<Button>Add Product</Button>}
  />
) : (
  <DataTable columns={columns} data={items} />
)}
```

---

## Component Organization

- **Single-use components**: Co-locate in same file as page route
- **Reusable components**: Place in `src/components/` or `src/[route]/-components/` (prefix `-` dir for skipping file-routing)
- **Each list item**: Render in separate component for independent mutation/status

```tsx
// In page route file
function ProductPage() {
  return <ProductList />;
}

function ProductList() {
  const { data } = useSuspenseQuery(...);
  return data.items.map(item => <ProductItem key={item.id} item={item} />);
}

function ProductItem({ item }: { item: Product }) {
  const deleteMutation = useMutation(...);
  // Each item manages its own mutation state
  return <div>...</div>;
}

export const Route = createFileRoute(...)({ component: ProductPage });
```

---

## File Upload in Forms

For forms with image/file uploads, manage uploaded files as separate state:

```tsx
import { useUploadFiles } from "@better-upload/client";
import type { PublicS3File } from "@/lib/schemas/s3";

function FormWithImages({ initialImages = [] }: { initialImages?: PublicS3File[] }) {
  const [images, setImages] = useState<PublicS3File[]>(initialImages);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { upload, progresses, isPending: isUploading } = useUploadFiles({
    route: "images",
    api: "/api/upload",
    onUploadComplete: ({ files }) => {
      const uploaded: PublicS3File[] = files.map((f) => ({
        key: f.objectInfo.key,
        metadata: { public_url: f.objectInfo.metadata.url },
      }));
      setImages((prev) => [...prev, ...uploaded]);
      setPreviews([]);
      toast.success(`Uploaded ${files.length} image(s)`);
    },
    onUploadFail: ({ failedFiles }) => {
      failedFiles.forEach((f) => toast.error(`Failed: ${f.raw.name}`));
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;

    // Generate previews
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => setPreviews((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });

    upload(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => setImages((prev) => prev.filter((_, i) => i !== index));

  // On submit, include images: { files: images }
}
```

### Image Grid with Upload Progress

```tsx
<div className="space-y-2">
  <label className="text-sm font-medium">Images</label>

  {(images.length > 0 || (isUploading && previews.length > 0)) && (
    <div className="grid grid-cols-4 gap-2">
      {/* Uploaded images */}
      {images.map((image, index) => (
        <div key={image.key} className="group relative aspect-square">
          <img src={image.metadata.public_url} className="size-full rounded-md object-cover" />
          <button
            type="button"
            onClick={() => removeImage(index)}
            className="bg-destructive absolute -right-1 -top-1 rounded-full p-1 opacity-0 group-hover:opacity-100"
          >
            <X className="text-white size-3" />
          </button>
        </div>
      ))}

      {/* Upload progress previews */}
      {isUploading && previews.map((preview, index) => (
        <div key={index} className="relative aspect-square">
          <img src={preview} className="size-full rounded-md object-cover opacity-60" />
          {progresses[index] && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
              <span className="text-sm font-semibold text-white">
                {Math.round(progresses[index].progress * 100)}%
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  )}

  <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
    <Upload data-icon="inline-start" />
    {isUploading ? "Uploading..." : "Add Images"}
  </Button>
</div>
```

---

## Navigation Links

Add feature links to appropriate sidebars:
- **App user features**: `src/components/app/app-sidebar.tsx`
- **Admin features**: `src/components/admin/admin-sidebar.tsx`
