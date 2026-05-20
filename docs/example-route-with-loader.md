# Example Route with Loader

The canonical client-side pattern: prefetch in the loader, read with `useSuspenseQuery` in the component, refetch after a mutation. Mirrors `src/routes/(user)/app/todo.tsx` and `src/routes/admin/users.tsx`.

## Why this pattern

- Loader runs during navigation, so the request kicks off as early as possible.
- `useSuspenseQuery` reads the prefetched data without an extra render-then-fetch.
- `refetch()` after a mutation keeps cache and UI consistent without manual cache writes (no optimistic updates).

## Skeleton — list + create

```tsx
// src/routes/(user)/app/blog.tsx
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PagePending } from "@/components/common/page-pending";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { orpc } from "@/lib/orpc";

export const Route = createFileRoute("/(user)/app/blog")({
  component: BlogPage,
  pendingComponent: PagePending,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(orpc.blog.list.queryOptions());
  },
});

function BlogPage() {
  const [title, setTitle] = useState("");

  const { data: posts, refetch } = useSuspenseQuery(orpc.blog.list.queryOptions());

  const createPost = useMutation(
    orpc.blog.create.mutationOptions({
      onSuccess: () => {
        refetch();
        setTitle("");
      },
    }),
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Post title" />
        <Button
          disabled={createPost.isPending || !title.trim()}
          onClick={() => createPost.mutate({ title: title.trim(), body: "" })}
        >
          Add
        </Button>
      </div>

      <ul className="space-y-2">
        {posts.map((post) => (
          <li key={post.id} className="rounded border border-border p-3">
            {post.title}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Skeleton — paginated list with search params

When the route has filters or pagination, validate the search params with `zod`, declare `loaderDeps`, and pass the same input into both the loader prefetch and the component query. See `src/routes/admin/users.tsx` for a live example.

```tsx
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import * as z from "zod";
import { orpc } from "@/lib/orpc";

export const Route = createFileRoute("/(user)/app/blog")({
  component: BlogPage,
  validateSearch: z.object({
    page: z.number().int().positive().catch(1),
  }),
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ deps, context }) => {
    context.queryClient.prefetchQuery(orpc.blog.list.queryOptions({ input: { page: deps.page } }));
    return { page: deps.page };
  },
});

function BlogPage() {
  const page = Route.useSearch({ select: (s) => s.page });
  const { data, refetch } = useSuspenseQuery(orpc.blog.list.queryOptions({ input: { page } }));
  // ... render data.items, data.pageCount, etc.
}
```

## Rules

- Use the _same_ `queryOptions(...)` call in the loader and the component. Different inputs = different cache keys = double fetch.
- Prefer `ensureQueryData` when the page cannot render without the data (suspense path); use `prefetchQuery` when you want navigation to proceed even if prefetch is mid-flight.
- After a mutation, call `refetch()` (or invalidate via `queryClient.invalidateQueries`). Do not write to the cache by hand.
- Skip `useMemo` / `useCallback` / `memo` — React Compiler handles it.
- Per-row mutation state (busy spinners, disabled buttons) belongs inside the row component, not the page.
