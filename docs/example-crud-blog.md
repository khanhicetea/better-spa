# Example CRUD Feature: Blog Posts

This document provides a complete reference implementation of a CRUD feature. Use this as a template when creating new features with similar patterns.

---

## Overview

The Blog Posts feature demonstrates:
- User-scoped data (each user sees only their posts)
- Paginated list with TanStack Table
- Create/Edit form in a Sheet (slide-over panel)
- Delete confirmation with AlertDialog
- File upload for cover images
- Optional fields (description, publishedAt)

---

## 1. Database Layer

### 1.1 Migration

**File:** `src/server/db/migrations/006_blog.ts`

```typescript
import type { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("blog_post")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("user_id", "text", (col) =>
      col
        .notNull()
        .references("user.id")
        .onDelete("cascade")
        .onUpdate("cascade"),
    )
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("cover", "jsonb")                        // PublicS3File JSON
    .addColumn("description", "text")
    .addColumn("published_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo("now()"),
    )
    .addColumn("updated_at", "timestamptz", (col) =>
      col.notNull().defaultTo("now()"),
    )
    .execute();

  // Add indexes for common queries
  await db.schema
    .createIndex("idx_blog_post_user_id")
    .on("blog_post")
    .column("user_id")
    .execute();

  await db.schema
    .createIndex("idx_blog_post_published_at")
    .on("blog_post")
    .column("published_at")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("blog_post").execute();
}
```

**Key patterns:**
- Use `text` for IDs (UUIDs stored as text)
- Foreign keys with `cascade` for cleanup
- `timestamptz` for dates (timezone-aware)
- `jsonb` for complex nested data (like PublicS3File)
- Add indexes for columns used in WHERE/ORDER BY

### 1.2 Schema Types

**File:** `src/server/db/schema/blog.ts`

```typescript
import type {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from "kysely";
import type { PublicS3File } from "@/lib/schemas/s3";

export interface BlogPostTable {
  id: Generated<string>;           // Auto-generated UUID
  userId: string;
  title: string;
  cover: PublicS3File | null;           // JSONB column mapped to TypeScript type
  description: string | null;
  publishedAt: Date | null;
  createdAt: ColumnType<Date, Date | undefined, never>;  // Read: Date, Insert: optional, Update: never
  updatedAt: Date;
}

// Export these 3 types for use in repositories and handlers
export type BlogPost = Selectable<BlogPostTable>;
export type BlogPostInsert = Insertable<BlogPostTable>;
export type BlogPostUpdate = Updateable<BlogPostTable>;
```

**Key patterns:**
- `Generated<T>` for auto-generated fields
- `ColumnType<Select, Insert, Update>` for fields with different read/write behavior
- Nullable fields use `T | null`
- Export `Selectable`, `Insertable`, `Updateable` variants

### 1.3 Register Schema

**File:** `src/server/db/schema/index.ts`

```typescript
import type { BlogPostTable } from "./blog";

export interface Database {
  // ... other tables
  blogPost: BlogPostTable;
}
```

### 1.4 Repository

**File:** `src/server/db/repositories/blogPost.repo.ts`

```typescript
import type { DB } from "../init";
import { Repository } from "./base";

export class BlogPostRepository extends Repository<"blogPost"> {
  constructor(db: DB) {
    super(db, "blogPost");
  }

  // Add custom methods here if needed
  // async findPublished() {
  //   return this.find({
  //     where: (qb) => qb.whereNotNull("publishedAt"),
  //     modify: (qb) => qb.orderBy("publishedAt", "desc"),
  //   });
  // }
}
```

**Base Repository provides:**
- `find(options)` - Find with conditions
- `findById(id)` - Find single by ID
- `findByIdOrFail(id)` - Find or throw NotFoundError
- `findPaginated(options)` - Paginated results with totalCount
- `insertReturn(data)` - Insert and return
- `updateById({ id, data })` - Update by ID
- `deleteById(id)` - Delete by ID

### 1.5 Register Repository

**File:** `src/lib/db/repositories/index.ts`

```typescript
import { BlogPostRepository } from "./blogPost.repo";

export function createRepos(db: DB) {
  const repos = {
    // ... other repos
    blogPost: new BlogPostRepository(db),
  };
  // ...
}

export { BlogPostRepository } from "./blogPost.repo";
```

---

## 2. RPC Layer (Handlers)

**File:** `src/rpc/handlers/blog.ts`

```typescript
import { pickBy } from "lodash-es";
import { z } from "zod";
import { generateUUID } from "@/lib/helpers/data";
import { type PublicS3File, PublicS3FileSchema } from "@/lib/schemas/s3";
import { authedProcedure } from "../base";

// LIST - Paginated, user-scoped
export const listBlogPosts = authedProcedure
  .input(
    z.object({
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(100).default(20),
    }),
  )
  .handler(async ({ input, context }) => {
    const { repos } = context;
    return repos.blogPost.findPaginated({
      page: input.page,
      pageSize: input.pageSize,
      where: { userId: context.user.id },  // User-scoped
      modify: (qb) => qb.orderBy("createdAt", "desc"),
    });
  });

// GET - Single item with ownership check
export const getBlogPost = authedProcedure
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context, errors }) => {
    const { repos } = context;
    const post = await repos.blogPost.findById(input.id);
    if (!post || post.userId !== context.user.id) {
      throw errors.NOT_FOUND();
    }
    return post;
  });

// CREATE - Generate UUID, set user
export const createBlogPost = authedProcedure
  .input(
    z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      cover: PublicS3FileSchema.nullable().optional(),
      publishedAt: z.date().nullable().optional(),
    }),
  )
  .handler(async ({ input, context }) => {
    const { repos } = context;
    const newPost = await repos.blogPost.insertReturn({
      id: generateUUID(),
      userId: context.user.id,
      title: input.title,
      description: input.description ?? null,
      cover: (input.cover as PublicS3File) ?? null,
      publishedAt: input.publishedAt ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return newPost ?? null;
  });

// UPDATE - Ownership check, partial updates
export const updateBlogPost = authedProcedure
  .input(
    z.object({
      id: z.string(),
      title: z.string().min(1).optional(),
      description: z.string().nullable().optional(),
      cover: PublicS3FileSchema.nullable().optional(),
      publishedAt: z.date().nullable().optional(),
    }),
  )
  .handler(async ({ input, context, errors }) => {
    const { repos } = context;
    const { id, ...updates } = input;

    // Ownership check
    const existingPost = await repos.blogPost.findById(id);
    if (!existingPost || existingPost.userId !== context.user.id) {
      throw errors.NOT_FOUND();
    }

    // Only update provided fields (pickBy removes undefined)
    const updatedPost = await repos.blogPost.updateById({
      id,
      data: {
        ...pickBy(updates, (value) => value !== undefined),
        updatedAt: new Date(),
      },
    });
    return updatedPost ?? null;
  });

// DELETE - Ownership check
export const deleteBlogPost = authedProcedure
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context, errors }) => {
    const { repos } = context;

    const existingPost = await repos.blogPost.findById(input.id);
    if (!existingPost || existingPost.userId !== context.user.id) {
      throw errors.NOT_FOUND();
    }

    await repos.blogPost.deleteById(input.id);
    return { success: true };
  });
```

**Key patterns:**
- Use `authedProcedure` for authenticated endpoints
- Always validate ownership for user-scoped data
- Use `pickBy` for partial updates (only update provided fields)
- Use `generateUUID()` for new IDs
- Use `errors.NOT_FOUND()` for missing/unauthorized resources
- Input validation with Zod schemas

### 2.1 Register in Router

**File:** `src/rpc/router.ts`

```typescript
import * as blog from "./handlers/blog";

export const rpcRouter = {
  // ... other handlers
  blog,
};
```

---

## 3. Page Route & UI

**File:** `src/routes/(user)/app/blog.tsx`

### 3.1 Route Definition

```typescript
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import * as z from "zod";
import { PagePending } from "@/components/common/page-pending";
import { orpc } from "@/lib/orpc";

export const Route = createFileRoute("/(user)/app/blog")({
  component: BlogPage,
  pendingComponent: PagePending,
  // Search params validation
  validateSearch: z.object({
    page: z.number().int().positive().catch(1),
  }),
  // Dependencies for loader (re-run when these change)
  loaderDeps: ({ search }) => ({ page: search.page }),
  // Prefetch data on server
  loader: async ({ deps, context }) => {
    context.queryClient.prefetchQuery(
      orpc.blog.listBlogPosts.queryOptions({
        input: { page: deps.page },
      }),
    );
    return { page: deps.page };
  },
});
```

### 3.2 Main Page Component

```typescript
function BlogPage() {
  const page = Route.useSearch({ select: (s) => s.page as number });
  const navigate = Route.useNavigate();

  // Fetch data (uses prefetched data from loader)
  const {
    data: { items: posts, pageCount, pageSize, totalCount },
    refetch,
  } = useSuspenseQuery(
    orpc.blog.listBlogPosts.queryOptions({
      input: { page },
    }),
  );

  // UI state
  const [editingPost, setEditingPost] = useState<BlogPost | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deletingPost, setDeletingPost] = useState<BlogPost | null>(null);

  // Table columns definition
  const columns: ColumnDef<BlogPost>[] = [
    // ... column definitions
  ];

  return (
    <div className="space-y-4 py-4">
      {/* Header with title and Add button */}
      <div className="flex items-center justify-between">
        <PageTitle title="Blog Posts" description="Manage your blog posts" />
        <Button onClick={() => { setEditingPost(undefined); setIsFormOpen(true); }}>
          <PlusCircle className="size-4" />
          <span>Add Post</span>
        </Button>
      </div>

      {/* Data table */}
      <div className="overflow-hidden rounded-md border">
        <Table>{/* ... */}</Table>
      </div>

      {/* Pagination */}
      <DataTablePagination
        currentPage={page}
        pageCount={pageCount}
        totalCount={totalCount}
        pageSize={pageSize}
        itemsCount={posts.length}
        onPageChange={(page) => navigate({ search: { page } })}
      />

      {/* Create/Edit form (Sheet) */}
      <BlogPostForm
        key={editingPost?.id}
        post={editingPost}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={() => {
          refetch();
          setIsFormOpen(false);
          toast.success(editingPost ? "Blog post updated" : "Blog post created");
        }}
      />

      {/* Delete confirmation dialog */}
      {deletingPost && (
        <DeleteBlogPostDialog
          post={deletingPost}
          onOpenChange={(v) => !v && setDeletingPost(null)}
          onSuccess={() => {
            refetch();
            setDeletingPost(null);
            toast.success("Blog post deleted");
          }}
        />
      )}
    </div>
  );
}
```

### 3.3 Form Component (Create/Edit)

```typescript
function BlogPostForm({
  post,
  open,
  onOpenChange,
  onSuccess,
}: {
  post?: BlogPost;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  // Form setup with default values
  const form = useForm<BlogPostFormData>({
    defaultValues: {
      title: post?.title ?? "",
      description: post?.description ?? "",
      cover: post?.cover ?? null,
      publishedAt: post?.publishedAt
        ? new Date(post.publishedAt).toISOString().slice(0, 16)
        : "",
    },
  });

  // Separate mutations for create and update
  const createMutation = useMutation(
    orpc.blog.createBlogPost.mutationOptions({
      onSuccess: () => {
        onOpenChange(false);
        form.reset();
        onSuccess();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const updateMutation = useMutation(
    orpc.blog.updateBlogPost.mutationOptions({
      onSuccess: () => {
        onOpenChange(false);
        onSuccess();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const handleSubmit = async (data: BlogPostFormData) => {
    const payload = {
      title: data.title,
      description: data.description || undefined,
      cover: data.cover,
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
    };

    if (post) {
      await updateMutation.mutateAsync({ id: post.id, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            {/* Form fields */}
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
```

### 3.4 Delete Dialog Component

```typescript
function DeleteBlogPostDialog({
  post,
  onOpenChange,
  onSuccess,
}: {
  post: BlogPost;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const deleteMutation = useMutation(
    orpc.blog.deleteBlogPost.mutationOptions({
      onSuccess: () => {
        onOpenChange(false);
        onSuccess();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <AlertDialog open={true} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Blog Post</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{post.title}"? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteMutation.isPending}
            onClick={async () => {
              await deleteMutation.mutateAsync({ id: post.id });
            }}
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

## 4. File Upload Pattern

For features that need file uploads:

```typescript
import { useUploadFile } from "@better-upload/client";

const { upload, isPending: isUploading } = useUploadFile({
  route: "images",              // Upload route name
  api: "/api/upload",           // Upload endpoint
  onUploadComplete: ({ file }) => {
    const s3File: PublicS3File = {
      key: file.objectInfo.key,
      metadata: { public_url: file.objectInfo.metadata.url },
    };
    form.setValue("cover", s3File);
  },
  onError: (error) => {
    toast.error(error.message || "Upload failed");
  },
});

// Trigger upload
const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file && file.type.startsWith("image/")) {
    upload(file);
  }
};
```

---

## 5. Step-by-Step Guide for New Features

### Step 1: Database

1. Create migration: `src/lib/db/migrations/XXX_feature.ts`
2. Create schema types: `src/lib/db/schema/feature.ts`
3. Add table to Database interface: `src/lib/db/schema/index.ts`
4. Create repository: `src/lib/db/repositories/feature.repo.ts`
5. Register repository: `src/lib/db/repositories/index.ts`
6. Run migration: `pnpm kysely migrate latest`
7. Update `docs/db-schema.md`

### Step 2: RPC Handlers

1. Create handler file: `src/rpc/handlers/feature.ts`
2. Implement CRUD procedures:
   - `listFeatures` - Paginated list (user-scoped if needed)
   - `getFeature` - Single item by ID
   - `createFeature` - Create new item
   - `updateFeature` - Update existing item
   - `deleteFeature` - Delete item
3. Register in router: `src/rpc/router.ts`

### Step 3: Page Route

1. Create route file: `src/routes/(user)/app/feature.tsx` (or admin route)
2. Define route with `createFileRoute`
3. Add search validation for pagination
4. Add loader for data prefetching

### Step 4: UI Components

1. Main page component with:
   - Page header (title + add button)
   - Data table with columns
   - Pagination component
2. Form component (Sheet) for create/edit
3. Delete confirmation dialog

### Step 5: Navigation

Add link to sidebar: `src/components/app/app-sidebar.tsx`

```typescript
{
  title: "Blog",
  url: "/app/blog",
  icon: FileTextIcon,
}
```

### Step 6: Finalize

Run `pnpm check` to verify everything compiles and passes lint.

---

## 6. Common Patterns Reference

### Type Inference from RPC Output

```typescript
import type { Outputs } from "@/rpc/types";

type BlogPost = Outputs["blog"]["listBlogPosts"]["items"][number];
```

### Pagination with URL State

```typescript
validateSearch: z.object({
  page: z.number().int().positive().catch(1),
}),
loaderDeps: ({ search }) => ({ page: search.page }),
```

### Refetch After Mutation

```typescript
const { refetch } = useSuspenseQuery(...);

// In mutation onSuccess
onSuccess={() => {
  refetch();
  toast.success("Saved!");
}}
```

### Conditional Form (Create vs Edit)

```typescript
<BlogPostForm
  key={editingPost?.id}  // Reset form when switching items
  post={editingPost}      // undefined = create, defined = edit
  open={isFormOpen}
  onOpenChange={setIsFormOpen}
  onSuccess={() => { /* ... */ }}
/>
```

### Ownership Validation Pattern

```typescript
const item = await repos.entity.findById(id);
if (!item || item.userId !== context.user.id) {
  throw errors.NOT_FOUND();  // Don't reveal existence
}
```
