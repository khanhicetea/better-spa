# UI/UX Guidelines

**For Agents**: Read this doc when implementing any UI work (forms, dialogs, tables, layouts).

**CRITICAL**: This project uses **Base UI** (`@base-ui/react`), NOT Radix UI. See CLAUDE.md for the render prop pattern.

---

## Styling

- Use **shadcn/ui** components with **Base UI** primitives
- Use **Tailwind CSS v4** with theme color variables
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

Use **Lucide** icons. Skip text label if icon is universally recognized.

```tsx
import { Trash2, Pencil, Plus, Check } from "lucide-react";

// Icon-only button
<Button variant="ghost" size="icon-sm"><Trash2 /></Button>

// Icon with text (use data-icon attribute for spacing)
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

## CRUD Component Guidelines

| Fields | Component | Notes |
|--------|-----------|-------|
| 1-3 | `Dialog` | Quick inline editing |
| 4-5 | `Sheet` | Slide-over panel |
| 6+ | Separate page | `/entity/form/[id]` |
| Delete/Confirm | `AlertDialog` | With destructive action |

### Dialog Example

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger render={<Button />}>Add Item</DialogTrigger>
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
```

### AlertDialog Example

```tsx
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

## Tables

- Use shadcn table for simple tables
- Use **TanStack Table** with column definitions for complex tables
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
- **Reusable components**: `src/components/` or `src/[route]/-components/`
- **Each list item**: Separate component for independent mutation/status

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
  return <div>...</div>;
}

export const Route = createFileRoute(...)({ component: ProductPage });
```

---

## File Upload in Forms

See [docs/file-storage.md](file-storage.md) for complete file upload patterns.

---

## Navigation Links

- **App user features**: `src/components/app/app-sidebar.tsx`
- **Admin features**: `src/components/admin/admin-sidebar.tsx`
