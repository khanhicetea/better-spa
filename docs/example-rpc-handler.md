# Example RPC Handler

A new domain should validate input, declare serialized output, use repositories, and enforce
ownership in the SQL write predicate.

Live RPC files are under `packages/rpc/src/`. Adapt this sketch only after adding a focused
repository method such as `updateOwned`/`deleteOwned`.

```ts
// packages/rpc/src/handlers/blog.ts
import * as z from "zod";
import { authedProcedure } from "../base";

const blogSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

function toBlog(row: BlogPost) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const update = authedProcedure
  .input(
    z.object({
      id: z.string(),
      title: z.string().min(1).max(200).optional(),
      body: z.string().min(1).optional(),
    }),
  )
  .output(blogSchema)
  .handler(async ({ input, context, errors }) => {
    const patch: { title?: string; body?: string; updatedAt: Date } = {
      updatedAt: new Date(),
    };
    if (input.title !== undefined) patch.title = input.title;
    if (input.body !== undefined) patch.body = input.body;

    const post = await context.repos.blogPost.updateOwned({
      id: input.id,
      userId: context.user.id,
      data: patch,
    });
    if (!post) throw errors.NOT_FOUND();
    return toBlog(post);
  });

export const remove = authedProcedure
  .input(z.object({ id: z.string() }))
  .output(z.object({ success: z.literal(true) }))
  .handler(async ({ input, context, errors }) => {
    const deleted = await context.repos.blogPost.deleteOwned({
      id: input.id,
      userId: context.user.id,
    });
    if (!deleted) throw errors.NOT_FOUND();
    return { success: true };
  });
```

Wire it in `packages/rpc/src/router.ts`:

```ts
blog: {
  update: blog.update,
  delete: blog.remove,
}
```

Checklist:

- input and output use Zod
- dates are ISO strings
- only UI-required fields are exposed
- auth level matches the action
- update/delete ownership is part of the SQL predicate
- writes use a repository
- the result is serializable
