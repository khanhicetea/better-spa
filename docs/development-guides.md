# Development Guides

**For Agents**: Read this doc when implementing new features or CRUD operations.

---

## Agent Pre-Implementation Checklist

Before writing any code:

1. **Read CLAUDE.md first** - Contains critical rules that differ from typical projects
2. **List relevant docs** - Identify which docs apply to your task
3. **Read those docs** - Understand patterns before implementing
4. **Find an example** - Look at existing similar code in the codebase
5. **Plan before code** - For new features, draft the approach first

### Example Reference Files

- Example admin user management : checking `src/routes/admin/users.tsx`
- Example Blog CRUD (Listing pagination, Tanstack Table, Single Form for create/update) : checking `docs/example-crud-blog.md`

---

## Data Management

All server data operations should go through RPC layer for centralized management:

- **Data Fetching**: Use RPC procedures for all server data retrieval
- **Queries**: Implement query logic in RPC handlers
- **Forms**: Handle form submissions via RPC mutations
- **Mutations**: Centralize all data modifications in RPC procedures
- **NO OPTIMISTIC UPDATES**: Don't use optimistic updates as a anti-pattern, as it can lead to inconsistencies and bugs. Instead, use pessimistic updates or implement a more robust optimistic update strategy (support concurrent updates)
- This ensures type safety, consistent error handling, and maintainable code structure

---

## RPC Procedures

### RPC Handlers Organization

RPC procedures are organized in `src/rpc/handlers/`:

- `app.ts`: Shell data and application-level procedures
- `form.ts`: Form handling procedures with Zod validation
- `user.ts`: User-related procedures
- Each handler uses `baseProcedure` for consistent context handling
- Procedures return type-safe responses for client consumption

### Authentication Procedures

The RPC system includes authentication middleware for protected procedures:

- `baseProcedure`: Base procedure with session context
- `publicProcedure`: Alias for baseProcedure (public access)
- `authedProcedure`: Protected procedure requiring valid session
- `adminProcedure`: Protected admin procedure requiring valid admin role session
- The `authMiddleware` validates session and extracts user data
- Use `authedProcedure` for routes requiring authentication
- Use `adminProcedure` for routes requiring admin role

### Usage in RPC Handlers (Example with Repository)

```typescript
export const listUsers = adminProcedure
  .input(z.object({ page: z.number().int().positive() }))
  .handler(async ({ input, context }) => {
    const { repos } = context;
    const { page } = input;
    const pageSize = 10;

    const result = await repos.user.findPaginated(page, pageSize, (qb) =>
      qb.orderBy("createdAt", "desc"),
    );

    return {
      users: result.items,
      page,
      pageSize: result.pageSize,
      totalCount: result.totalCount,
      pageCount: result.pageCount,
    };
  });
```

---

## Adding New Features/Components

### Add New Pages

- **Public Page**: Add to `src/routes/`
- **Admin Page**: Add to `src/routes/admin/`
- **Protected Page**: Add to `src/routes/(user)/`
- **Protected User App Page**: Add to `src/routes/(user)/app/`

### Add New RPC Procedures

1. Create procedure in `src/rpc/`
2. Add to router in `src/rpc/router.ts`
3. Use in route loader, beforeLoad via `context.rpcClient`
4. Use in component via `useQuery(orpc.[route].[action].queryOptions(...))` and `useMutation(orpc.[route].[action].mutationOptions(...))`

### Add New UI Components

```bash
pnpm ui add component-name
```

### Form Handling Example

The demo form at `src/routes/(test)/hello-form.tsx` shows how to:

- Create a form using `react-hook-form` and shadcn/ui components
- Use `useMutation` with oRPC for form submission
- Handle form errors with the `handleFormError` utility
- Display success messages with Sonner toast notifications

### Data Fetching Pattern (in page route)

- Use `useQuery` for fetching data
- Use `useMutation` for updating data
- Prefetch data in Route loader, then use same queryKey in Route component (can leverage orpc key utils)
- Keep simple by using refetch from useQuery, useSuspendQuery instead of invalidation by key in same component

**Example**

```ts
export const Route = createFileRoute("/admin/users")({
  component: UsersPage,
  validateSearch: z.object({
    page: z.number().int().positive().catch(1),
  }),
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ deps, context }) => {
    context.queryClient.prefetchQuery(
      orpc.user.listUsers.queryOptions({
        input: { page: deps.page },
      }), // same query options, same key
    );

    return { app: context.shell.app };
  },
});

function UsersPage() {
  const { app } = Route.useLoaderData(); // sample of use loader data from reading from context
  const page = Route.useSearch({ select: (s) => s.page as number }); // sample for reading in query params
  const {
    data: { users, pageCount, pageSize, totalCount },
    refetch: refetchUsers, // using refetch data on invalidation instead of invalidation by key in same component
  } = useSuspenseQuery(
    orpc.user.listUsers.queryOptions({
      input: { page },
    }), // same query options, same key
  );

  // render function below
}
```

### New feature implementation checklist

- Plan first, ask first, implement later
- Draft the db schema changes before implementing the feature, asking for confirmation
- The plan orders : DB schema > RPC handlers > Page route > UI > Check types > DONE
- Co-locate the sub components in the same file as page route (put in below the main page route component) if it only use once in page route
- Only use pagination if I mentions
- **ITEM** : Each item should be rendered in a separate component so it mutation can be done independently, its status is managed by the component itself
- App user feature, add link into `src/components/app/app-sidebar.tsx`
- Admin feature, add link into `src/components/admin/admin-sidebar.tsx`

---

## Component Patterns

### Combined Create/Edit Form Dialog

Use a single dialog component for both create and edit modes. **Remember: Use `render` prop, NOT `asChild`**.

```tsx
interface FormDialogProps {
  item?: Item;           // undefined = create mode, defined = edit mode
  onSuccess: () => void; // refetch callback
  children: React.ReactNode; // trigger button
}

function ItemFormDialog({ item, onSuccess, children }: FormDialogProps) {
  const [open, setOpen] = useState(false);
  const isEditing = !!item;

  const form = useForm<FormData>({
    defaultValues: {
      name: item?.name ?? "",
      description: item?.description ?? "",
    },
  });

  const createMutation = useMutation(orpc.item.create.mutationOptions({
    onSuccess: () => { toast.success("Created"); handleClose(); onSuccess(); },
    onError: (error) => handleFormError(error, form.setError),
  }));

  const updateMutation = useMutation(orpc.item.update.mutationOptions({
    onSuccess: () => { toast.success("Updated"); handleClose(); onSuccess(); },
    onError: (error) => handleFormError(error, form.setError),
  }));

  const handleClose = () => {
    setOpen(false);
    form.reset();
  };

  const onSubmit = async (data: FormData) => {
    if (isEditing) {
      await updateMutation.mutateAsync({ id: item.id, ...data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children as React.ReactElement} />
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Item" : "Create Item"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Form fields */}
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : isEditing ? "Save Changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

**Note**: For page-level dialogs, use controlled state (`open`/`onOpenChange`) and use key prop `key={item.id}` for resetting form state when `item` changes. This centralizes state, reduces duplication, preserves form state on reopen, and improves maintainability.

### Delete Confirmation Dialog

```tsx
function DeleteItemDialog({ item, onSuccess }: { item: Item; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);

  const deleteMutation = useMutation(orpc.item.delete.mutationOptions({
    onSuccess: () => { toast.success("Deleted"); setOpen(false); onSuccess(); },
    onError: (error) => toast.error(error.message || "Failed to delete"),
  }));

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="destructive" size="icon-sm" />}>
        <Trash2 />
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia><Trash2 className="text-destructive" /></AlertDialogMedia>
          <AlertDialogTitle>Delete Item</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{item.name}"? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
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

### Empty State Pattern

```tsx
function EmptyState({ onSuccess }: { onSuccess: () => void }) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
      <div className="bg-muted mb-4 rounded-full p-4">
        <Package className="text-muted-foreground size-8" />
      </div>
      <h3 className="mb-2 text-lg font-semibold">No items yet</h3>
      <p className="text-muted-foreground mb-4 max-w-sm">
        Get started by creating your first item.
      </p>
      <ItemFormDialog onSuccess={onSuccess}>
        <Button><Plus data-icon="inline-start" />Create your first item</Button>
      </ItemFormDialog>
    </div>
  );
}
```

### Item Card with Actions

```tsx
function ItemCard({ item, onUpdate }: { item: Item; onUpdate: () => void }) {
  return (
    <Card className="group overflow-hidden pt-0">
      {/* Optional: Image/media section */}
      <div className="bg-muted relative aspect-video overflow-hidden">
        {item.image ? (
          <img src={item.image} alt={item.name} className="size-full object-contain" />
        ) : (
          <div className="flex size-full items-center justify-center">
            <ImagePlus className="text-muted-foreground/50 size-12" />
          </div>
        )}
      </div>
      <CardHeader>
        <CardTitle className="line-clamp-1">{item.name}</CardTitle>
        {item.description && (
          <CardDescription className="line-clamp-2">{item.description}</CardDescription>
        )}
        <CardAction>
          <div className="flex gap-1">
            <ItemFormDialog key={`${item.id}-${item.updatedAt}`} item={item} onSuccess={onUpdate}>
              <Button variant="ghost" size="icon-sm"><Pencil /></Button>
            </ItemFormDialog>
            <DeleteItemDialog item={item} onSuccess={onUpdate} />
          </div>
        </CardAction>
      </CardHeader>
    </Card>
  );
}
```

**Important**: Add `key` prop with `updatedAt` to form dialogs to reset form state when item changes.

### Grid Layout Pattern

```tsx
{items.length === 0 ? (
  <EmptyState onSuccess={refetch} />
) : (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    {items.map((item) => (
      <ItemCard key={item.id} item={item} onUpdate={refetch} />
    ))}
  </div>
)}
```

---

## RPC Handler Patterns

### Ownership Validation

Always validate ownership for user-scoped resources:

```typescript
export const updateItem = authedProcedure
  .input(z.object({ id: z.string(), name: z.string().optional() }))
  .handler(async ({ input, context, errors }) => {
    const { id, ...updates } = input;
    const existing = await context.repos.item.findById(id);

    // CRITICAL: Check both existence AND ownership
    if (!existing || existing.userId !== context.user.id) {
      throw errors.NOT_FOUND(); // Don't reveal existence to non-owners
    }

    return context.repos.item.updateById({
      id,
      data: { ...pickBy(updates, (v) => v !== undefined), updatedAt: new Date() },
    });
  });
```

### Zod Schemas for S3 Files

Reusable schema for file upload validation:

```typescript
const s3FileSchema = z.object({
  key: z.string(),
  metadata: z.object({ url: z.string() }),
});

const s3FilesSchema = z.object({
  files: z.array(s3FileSchema),
});

// Usage in input schema
.input(z.object({
  name: z.string().min(1),
  images: s3FilesSchema.optional(),
}))
```

---

## UI and UX Guidelines

- **Style**: Using shadcn UI components with Base UI primitives, tailwind css v4
- **Colors**: Using shadcn theme color variables like primary, secondary, muted, accent, etc. No specific color should be used directly without asking.
- **Responsiveness**: UI should be responsive, compact and nice
- **Icons**: Buttons should has icon from Lucide icons, if icon can common for its purpose, skip text label
- **Forms**: Form field should has label, error message, vertical first with "space-y-4"
- **CRUD**: If form action is simple, use `Sheet` for adding/editing or `Dialog` component for deleting, confirmation.
- **Tables**: Table should use Tanstack Table using columns def. No sorting, no column visibility, row actions is last column within 'justify-end'
- **Empty States**: Use shadcn Empty component in `src/components/ui/empty.tsx`

---

## CRUD Feature Implementation Guide

When implementing a new CRUD feature (e.g., orders, posts, categories), follow this exact sequence:

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
    // ... other columns
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
export const list[Feature]s = authedProcedure.handler(async ({ context }) => {
  return context.repos.[feature].find({
    where: { userId: context.user.id },
    modify: (qb) => qb.orderBy("createdAt", "desc"),
  });
});

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

// For update/delete: ALWAYS verify ownership
export const update[Feature] = authedProcedure
  .input(z.object({ id: z.string(), name: z.string().min(1).optional() }))
  .handler(async ({ input, context, errors }) => {
    const existing = await context.repos.[feature].findById(input.id);
    if (!existing || existing.userId !== context.user.id) throw errors.NOT_FOUND();
    // ... update logic
  });
```
Register in `src/rpc/router.ts`

### Step 5: Page Route Structure
```typescript
// src/routes/(user)/app/[feature].tsx
export const Route = createFileRoute("/(user)/app/[feature]")({
  component: [Feature]Page,
  pendingComponent: PagePending,
  loader: async ({ context }) => {
    context.queryClient.prefetchQuery(orpc.[feature].list.queryOptions());
  },
});

function [Feature]Page() {
  const { data, refetch } = useSuspenseQuery(orpc.[feature].list.queryOptions());
  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div><h1>Title</h1><p className="text-muted-foreground">Description</p></div>
        <[Feature]FormDialog onSuccess={refetch}><Button><Plus />Add</Button></[Feature]FormDialog>
      </div>
      {data.length === 0 ? <EmptyState onSuccess={refetch} /> : <ItemGrid items={data} onUpdate={refetch} />}
    </div>
  );
}
// Co-locate: EmptyState, ItemCard, FormDialog, DeleteDialog components below
```

### Key Patterns

**Ownership Validation**: Always check `entity.userId === context.user.id` before update/delete

**Form Dialogs**: Use controlled `open` state, reset form on close
```typescript
const [open, setOpen] = useState(false);
const handleClose = () => { setOpen(false); form.reset(); };
```

**Mutations with Refetch**: Pass `refetch` callback, call `onSuccess()` in mutation
```typescript
const mutation = useMutation(orpc.x.create.mutationOptions({
  onSuccess: () => { toast.success("Created"); handleClose(); onSuccess(); },
  onError: (error) => handleFormError(error, form.setError),
}));
```

**Partial Updates**: Use `pickBy` to filter undefined values
```typescript
import { pickBy } from "lodash-es";
const updates = pickBy(input, (v) => v !== undefined);
```
