# RPC Architecture

**For Agents**: Read this doc when creating API endpoints or working with RPC.

**CRITICAL**: This project uses **oRPC**, NOT tRPC. The APIs are different.

---

## Structure

```
src/rpc/
├── base.ts           # Base procedures with context
├── router.ts         # Main router
├── middlewares.ts    # Auth and rate limiting
├── types.d.ts        # Auto-generated types
└── handlers/         # Domain-organized procedures
    ├── app.ts        # Shell data
    ├── auth.ts       # Authentication
    ├── user.ts       # User management
    └── [domain].ts   # Your handlers
```

---

## Procedure Types

```typescript
import { baseProcedure, publicProcedure, authedProcedure, adminProcedure } from "@/rpc/base";

// baseProcedure - Base with rate limiting
// publicProcedure - Same as base (alias)
// authedProcedure - Requires valid session
// adminProcedure - Requires admin role
```

---

## Creating Procedures

```typescript
// src/rpc/handlers/product.ts
import { authedProcedure, adminProcedure } from "../base";
import { z } from "zod";

export const listProducts = authedProcedure
  .input(z.object({
    page: z.number().int().positive(),
    categoryId: z.string().optional()
  }))
  .handler(async ({ input, context }) => {
    const { repos, user } = context;
    return repos.product.findPaginated({
      page: input.page,
      pageSize: 20,
      where: input.categoryId ? { categoryId: input.categoryId } : undefined,
      modify: (qb) => qb.orderBy("createdAt", "desc")
    });
  });

export const deleteProduct = adminProcedure
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context }) => {
    await context.repos.product.deleteById(input.id);
    return { success: true };
  });
```

## Registering Handlers

```typescript
// src/rpc/router.ts
import { listProducts, deleteProduct } from "./handlers/product";

export const rpc = base.router({
  product: base.router({
    list: listProducts,
    delete: deleteProduct,
  }),
});
```

---

## Client Usage

### In Route Loaders

```typescript
export const Route = createFileRoute("/products")({
  loader: async ({ context }) => {
    context.queryClient.prefetchQuery(
      orpc.product.list.queryOptions({ input: { page: 1 } })
    );
  },
});
```

### In Components

```typescript
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";

function ProductList() {
  const { data, refetch } = useSuspenseQuery(
    orpc.product.list.queryOptions({ input: { page: 1 } })
  );

  const deleteMutation = useMutation(
    orpc.product.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Product deleted");
        refetch();
      },
    })
  );
}
```

---

## Context Available in Handlers

```typescript
interface ProcedureContext {
  repos: Repositories;      // Database repositories
  user?: User;              // Authenticated user (authed/admin procedures)
  session?: Session;        // Session data
  db: DB;                   // Direct Kysely access (prefer repos)
  headers: Headers;         // HTTP request headers
  auth: ServerAuth;         // Authentication service
  waitUntil: (promise: Promise<unknown>) => void;  // Background tasks
}
```

---

## Background Tasks

### waitUntil (Lightweight)

For quick, non-critical tasks that don't need persistence:

```typescript
export const createOrder = authedProcedure
  .input(orderSchema)
  .handler(async ({ input, context }) => {
    const order = await context.repos.order.create(input);

    // Run after response (non-blocking)
    context.waitUntil(sendOrderConfirmationEmail(order));
    context.waitUntil(trackAnalytics({ event: "order_created" }));

    return order;
  });
```

**Use for**: Analytics, webhooks, cache invalidation, minor cleanup

### Job Queue (Long-running)

For tasks that need persistence, retries, or scheduling, see [docs/job-queue-worker.md](job-queue-worker.md).

**Use for**: Exports, emails, reports, scheduled tasks

---

## Error Handling

```typescript
import { ORPCError } from "@orpc/server";

export const updateProduct = authedProcedure
  .input(updateSchema)
  .handler(async ({ input, context }) => {
    const product = await context.repos.product.findById(input.id);

    if (!product) {
      throw new ORPCError("NOT_FOUND", "Product not found");
    }

    if (product.userId !== context.user.id) {
      throw new ORPCError("FORBIDDEN", "Not authorized");
    }

    return context.repos.product.updateById({ id: input.id, data: input.data });
  });
```

---

## oRPC Client Setup

The client is configured in `src/lib/orpc.ts`:

- **Server-side**: Direct router client with request context
- **Client-side**: HTTP client with batching at `/api/rpc`

```typescript
import { rpcClient, orpc } from "@/lib/orpc";

// rpcClient - Direct client for programmatic use
// orpc - TanStack Query utilities (queryOptions, mutationOptions)
```
