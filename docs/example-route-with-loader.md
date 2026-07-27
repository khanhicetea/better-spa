# Example Route with Loader

The canonical client pattern awaits required data in the loader, reads it with
`useSuspenseQuery`, and invalidates through feature-owned query helpers after writes.

```ts
// apps/web/src/routes/(user)/app/-blog/queries.ts
import type { QueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";

export const blogListQueryOptions = () => orpc.blog.list.queryOptions();

export async function invalidateBlogList(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: blogListQueryOptions().queryKey });
}
```

```tsx
// apps/web/src/routes/(user)/app/blog.tsx
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PagePending } from "@/components/shell/page-pending";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { orpc } from "@/lib/orpc";
import { blogListQueryOptions, invalidateBlogList } from "./-blog/queries";

export const Route = createFileRoute("/(user)/app/blog")({
  component: BlogPage,
  pendingComponent: PagePending,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(blogListQueryOptions());
  },
});

function BlogPage() {
  const [title, setTitle] = useState("");
  const queryClient = useQueryClient();
  const { data: posts } = useSuspenseQuery(blogListQueryOptions());
  const createPost = useMutation(
    orpc.blog.create.mutationOptions({
      onSuccess: async () => {
        await invalidateBlogList(queryClient);
        setTitle("");
      },
    }),
  );

  return (
    <div>
      <Input value={title} onChange={(event) => setTitle(event.target.value)} />
      <Button onClick={() => createPost.mutate({ title, body: "" })}>Add</Button>
      {posts.map((post) => (
        <div key={post.id}>{post.title}</div>
      ))}
    </div>
  );
}
```

For pagination, validate search values, declare `loaderDeps`, and give the exact same input
to loader and component query options. See `apps/web/src/routes/admin/users.tsx`.

Use `ensureQueryData` when suspense rendering requires the result. Do not thread
`refetch` callbacks, write optimistic cache state, or add React memoization helpers.
