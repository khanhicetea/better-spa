# Example RPC Handler

A minimal handler showing the four things every domain handler must do: validate input with `zod`, use `context.repos`, enforce auth and ownership, and return a serializable shape.

Adapt this for any new domain. Replace `blogPost` and the `repos.blogPost` call with your own table, and pick a base procedure that matches the access level.

## Live RPC Files

```text
src/server/rpc/
  base.ts              # baseProcedure / authedProcedure / adminProcedure
  router.ts            # exports rpcRouter and any aliases
  handlers/<domain>.ts # one file per domain
```

## Skeleton

```ts
// src/server/rpc/handlers/blog.ts
import { pickBy } from "lodash-es";
import { z } from "zod";
import { generateUUID } from "@/lib/helpers/data";
import { authedProcedure } from "../base";

export const list = authedProcedure.handler(async ({ context }) => {
  const { repos } = context;
  return repos.blogPost.find({
    where: { userId: context.user.id },
    modify: (qb) => qb.orderBy("createdAt", "desc"),
  });
});

export const get = authedProcedure
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context, errors }) => {
    const { repos } = context;
    const post = await repos.blogPost.findById(input.id);
    if (!post || post.userId !== context.user.id) {
      throw errors.NOT_FOUND();
    }
    return post;
  });

export const create = authedProcedure
  .input(
    z.object({
      title: z.string().min(1).max(200),
      body: z.string().min(1),
    }),
  )
  .handler(async ({ input, context }) => {
    const { repos } = context;
    const created = await repos.blogPost.insertReturn({
      id: generateUUID(),
      userId: context.user.id,
      title: input.title,
      body: input.body,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return created ?? null;
  });

export const update = authedProcedure
  .input(
    z.object({
      id: z.string(),
      title: z.string().min(1).max(200).optional(),
      body: z.string().min(1).optional(),
    }),
  )
  .handler(async ({ input, context, errors }) => {
    const { repos } = context;
    const { id, ...patch } = input;

    const existing = await repos.blogPost.findById(id);
    if (!existing || existing.userId !== context.user.id) {
      throw errors.NOT_FOUND();
    }

    const updated = await repos.blogPost.updateById({
      id,
      data: {
        ...pickBy(patch, (v) => v !== undefined),
        updatedAt: new Date(),
      },
    });
    return updated ?? null;
  });

export const remove = authedProcedure
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context, errors }) => {
    const { repos } = context;
    const existing = await repos.blogPost.findById(input.id);
    if (!existing || existing.userId !== context.user.id) {
      throw errors.NOT_FOUND();
    }
    await repos.blogPost.deleteById(input.id);
    return { success: true };
  });
```

## Router Wiring

```ts
// src/server/rpc/router.ts
import * as blog from "./handlers/blog";

export const rpcRouter = {
  // ...
  blog: {
    list: blog.list,
    get: blog.get,
    create: blog.create,
    update: blog.update,
    delete: blog.remove,
  },
};
```

The alias `delete: blog.remove` is the convention — `delete` is reserved in JS so the file exports `remove` and the router renames it on the way out.

## Checklist

- [ ] Input is validated with `zod`.
- [ ] Procedure base matches the access level (`baseProcedure`, `authedProcedure`, `adminProcedure`).
- [ ] Reads and writes go through `context.repos`.
- [ ] Ownership is checked in the handler before any update or delete.
- [ ] `id` is generated with `generateUUID()`.
- [ ] `createdAt` set on insert; `updatedAt` set on insert and update.
- [ ] Return shape is serializable (no class instances, no `File`).
- [ ] Router entry added in `src/server/rpc/router.ts`.
