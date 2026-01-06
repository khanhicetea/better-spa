# UI/UX Guidelines

## Styling

- Use **shadcn/ui** components and **Tailwind CSS v4**
- Use theme color variables: `primary`, `secondary`, `muted`, `accent`, `destructive`
- No specific colors (e.g., `bg-blue-500`) without asking first
- UI should be responsive, compact, and clean

## Icons

- Use **Lucide** icons for buttons
- If icon is universally recognized for its action, skip text label
- Examples: trash icon for delete, pencil for edit, plus for add

```tsx
import { Trash2, Pencil, Plus } from "lucide-react";

<Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>
<Button><Plus className="h-4 w-4 mr-2" />Add Item</Button>
```

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

## CRUD Operations

- **Add/Edit**: Use `Sheet` component for simple forms
- **Delete/Confirm**: Use `Dialog` component

```tsx
// Dialog for create/edit if form has 1-3 fields
<Dialog>
  <DialogTrigger render={<Button>Add Item</Button>}></DialogTrigger>
  <DialogContent>
  <DialogHeader><DialogTitle>Add Item</DialogTitle></DialogHeader>
    {/* Form */}
  </DialogContent>
</Dialog>

// Sheet for create/edit if form more than 3 fields
<Sheet>
  <SheetTrigger render={<Button>Add Item</Button>}></SheetTrigger>
  <SheetContent>
  <SheetHeader><SheetTitle>Add Item</SheetTitle></SheetHeader>
    {/* Form */}
  </SheetContent>
</Sheet>

// Use separate page route for create/edit if form has more than 5 fields, but try to re-use the form component
// Example /product for listing so /product/form/[id] for create/edit form (id = empty ? new mode : edit mode)

// Dialog for delete confirmation
<AlertDialog>
  <AlertDialogTrigger render={<Button variant="destructive">Delete</Button>}></AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

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

## Navigation Links

Add feature links to appropriate sidebars:
- **App user features**: `src/components/app/app-sidebar.tsx`
- **Admin features**: `src/components/admin/admin-sidebar.tsx`
