# Development Guides

**For Agents**: Read this doc when implementing new features or CRUD operations.

---

## Pre-Implementation Checklist

1. **Read CLAUDE.md first** - Critical rules that differ from typical projects
2. **Read relevant docs** - See documentation table in CLAUDE.md
3. **Find existing examples** - Look at similar code in codebase
4. **Plan before code** - For new features, draft the approach first

### Example Reference Files

- Admin user management: `src/routes/admin/users.tsx`
- CRUD with TanStack Table: See Blog example below

---

## Data Management

- **All data operations through RPC layer**
- **NO OPTIMISTIC UPDATES** - Use pessimistic updates instead
- Use Repository pattern for DB access

---

## CRUD Feature Implementation

Follow this exact sequence when implementing a new feature:

### Step 1: Migration

```typescript
// src/lib/db/migrations/NNN_[feature].ts
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("[feature]")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("user_id", "text", (col) =>
      col.notNull().references("user.id").onDelete("cascade").onUpdate("cascade"))
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo("now()"))
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo("now()"))
    .execute();

  await db.schema.createIndex("idx_[feature]_user_id").on("[feature]").column("user_id").execute();
}
```

Run: `pnpm kysely migrate latest`

### Step 2: Schema Types

```typescript
// src/lib/db/schema/[feature].ts
export interface [Feature]Table {
  id: Generated<string>;
  userId: string;
  name: string;
  createdAt: ColumnType<Date, Date | undefined, never>;
  updatedAt: Date;
}
export type [Feature] = Selectable<[Feature]Table>;
export type [Feature]Insert = Insertable<[Feature]Table>;
export type [Feature]Update = Updateable<[Feature]Table>;
```

Register in `src/lib/db/schema/index.ts`

### Step 3: Repository

```typescript
// src/lib/db/repositories/[feature].repo.ts
export class [Feature]Repository extends Repository<"[feature]"> {
  constructor(db: DB) { super(db, "[feature]"); }
  // Only add methods for complex/reusable queries
}
```

Register in `src/lib/db/repositories/index.ts`

### Step 4: RPC Handlers

```typescript
// src/rpc/handlers/[feature].ts
import { pickBy } from "lodash-es";

// LIST - Paginated, user-scoped
export const list[Feature]s = authedProcedure
  .input(z.object({
    page: z.number().min(1).default(1),
    pageSize: z.number().min(1).max(100).default(20),
  }))
  .handler(async ({ input, context }) => {
    return context.repos.[feature].findPaginated({
      page: input.page,
      pageSize: input.pageSize,
      where: { userId: context.user.id },
      modify: (qb) => qb.orderBy("createdAt", "desc"),
    });
  });

// GET - Single item with ownership check
export const get[Feature] = authedProcedure
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context, errors }) => {
    const item = await context.repos.[feature].findById(input.id);
    if (!item || item.userId !== context.user.id) {
      throw errors.NOT_FOUND();
    }
    return item;
  });

// CREATE
export const create[Feature] = authedProcedure
  .input(z.object({ name: z.string().min(1) }))
  .handler(async ({ input, context }) => {
    return context.repos.[feature].insertReturn({
      id: generateUUID(),
      userId: context.user.id,
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

// UPDATE - Ownership check, partial updates
export const update[Feature] = authedProcedure
  .input(z.object({ id: z.string(), name: z.string().min(1).optional() }))
  .handler(async ({ input, context, errors }) => {
    const { id, ...updates } = input;
    const existing = await context.repos.[feature].findById(id);
    if (!existing || existing.userId !== context.user.id) {
      throw errors.NOT_FOUND();
    }
    return context.repos.[feature].updateById({
      id,
      data: { ...pickBy(updates, (v) => v !== undefined), updatedAt: new Date() },
    });
  });

// DELETE - Ownership check
export const delete[Feature] = authedProcedure
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context, errors }) => {
    const existing = await context.repos.[feature].findById(input.id);
    if (!existing || existing.userId !== context.user.id) {
      throw errors.NOT_FOUND();
    }
    await context.repos.[feature].deleteById(input.id);
    return { success: true };
  });
```

Register in `src/rpc/router.ts`

### Step 5: Page Route

```typescript
// src/routes/(user)/app/[feature].tsx
export const Route = createFileRoute("/(user)/app/[feature]")({
  component: [Feature]Page,
  pendingComponent: PagePending,
  validateSearch: z.object({
    page: z.number().int().positive().catch(1),
  }),
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ deps, context }) => {
    context.queryClient.prefetchQuery(
      orpc.[feature].list.queryOptions({ input: { page: deps.page } })
    );
  },
});

function [Feature]Page() {
  const page = Route.useSearch({ select: (s) => s.page as number });
  const navigate = Route.useNavigate();
  const { data: { items, pageCount, pageSize, totalCount }, refetch } = useSuspenseQuery(
    orpc.[feature].list.queryOptions({ input: { page } })
  );

  const [editingItem, setEditingItem] = useState<[Feature] | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<[Feature] | null>(null);

  return (
    <div className="space-y-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <PageTitle title="[Features]" description="Manage your items" />
        <Button onClick={() => { setEditingItem(undefined); setIsFormOpen(true); }}>
          <PlusCircle data-icon="inline-start" />Add
        </Button>
      </div>

      {/* Table or Empty State */}
      {items.length === 0 ? (
        <Empty title="No items" action={<Button>Add First Item</Button>} />
      ) : (
        <DataTable columns={columns} data={items} />
      )}

      {/* Pagination */}
      <DataTablePagination
        currentPage={page}
        pageCount={pageCount}
        onPageChange={(p) => navigate({ search: { page: p } })}
      />

      {/* Form Dialog/Sheet */}
      <[Feature]Form
        key={editingItem?.id}
        item={editingItem}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={() => { refetch(); setIsFormOpen(false); }}
      />

      {/* Delete Confirmation */}
      {deletingItem && (
        <Delete[Feature]Dialog
          item={deletingItem}
          onOpenChange={(v) => !v && setDeletingItem(null)}
          onSuccess={() => { refetch(); setDeletingItem(null); }}
        />
      )}
    </div>
  );
}
```

### Step 6: Navigation

Add link to sidebar: `src/components/app/app-sidebar.tsx` or `admin-sidebar.tsx`

### Step 7: Finalize

Run `pnpm check` to verify.

---

## Component Patterns

### Combined Create/Edit Form Dialog

```tsx
function ItemFormDialog({ item, onSuccess, children }: {
  item?: Item;
  onSuccess: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isEditing = !!item;

  const form = useForm<FormData>({
    defaultValues: { name: item?.name ?? "" },
  });

  const createMutation = useMutation(orpc.item.create.mutationOptions({
    onSuccess: () => { toast.success("Created"); handleClose(); onSuccess(); },
    onError: (error) => handleFormError(error, form.setError),
  }));

  const updateMutation = useMutation(orpc.item.update.mutationOptions({
    onSuccess: () => { toast.success("Updated"); handleClose(); onSuccess(); },
    onError: (error) => handleFormError(error, form.setError),
  }));

  const handleClose = () => { setOpen(false); form.reset(); };

  const onSubmit = async (data: FormData) => {
    if (isEditing) {
      await updateMutation.mutateAsync({ id: item.id, ...data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children as React.ReactElement} />
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit" : "Create"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Form fields */}
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

**Note**: For page-level dialogs, use controlled state and `key={item.id}` for resetting form state.

### Delete Confirmation Dialog

```tsx
function DeleteItemDialog({ item, onSuccess }: { item: Item; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const deleteMutation = useMutation(orpc.item.delete.mutationOptions({
    onSuccess: () => { toast.success("Deleted"); setOpen(false); onSuccess(); },
    onError: (error) => toast.error(error.message),
  }));

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="destructive" size="icon-sm" />}>
        <Trash2 />
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{item.name}"?</AlertDialogTitle>
          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => deleteMutation.mutate({ id: item.id })}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

---

## Key Patterns

### Ownership Validation

**Always check ownership** for user-scoped resources:

```typescript
const item = await context.repos.entity.findById(id);
if (!item || item.userId !== context.user.id) {
  throw errors.NOT_FOUND();  // Don't reveal existence
}
```

### Partial Updates with pickBy

```typescript
import { pickBy } from "lodash-es";
const updates = pickBy(input, (v) => v !== undefined);
```

### Type Inference from RPC Output

```typescript
import type { Outputs } from "@/rpc/types";
type BlogPost = Outputs["blog"]["listBlogPosts"]["items"][number];
```

### Pagination with URL State

```typescript
validateSearch: z.object({ page: z.number().int().positive().catch(1) }),
loaderDeps: ({ search }) => ({ page: search.page }),
```

### Refetch After Mutation

```typescript
const { refetch } = useSuspenseQuery(...);
// In mutation onSuccess:
onSuccess: () => { refetch(); toast.success("Saved!"); }
```

### Form State Reset with Key

```typescript
<FormDialog key={editingItem?.id} item={editingItem} />
```

---

## S3 File Schema

```typescript
const s3FileSchema = z.object({
  key: z.string(),
  metadata: z.object({ url: z.string() }),
});

const s3FilesSchema = z.object({
  files: z.array(s3FileSchema),
});
```

See [docs/file-storage.md](file-storage.md) for complete file upload patterns.
