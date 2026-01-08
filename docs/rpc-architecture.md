# RPC Architecture

**For Agents**: Read this doc when creating API endpoints or working with RPC.

**CRITICAL**: This project uses **oRPC**, NOT tRPC. The APIs are different.

---

Type-safe RPC layer using **oRPC** (not tRPC).

## Structure

```
src/rpc/
├── base.ts           # Base procedures with context and error definitions
├── router.ts         # Main router exporting all handlers
├── middlewares.ts    # Auth and rate limiting middleware
├── types.d.ts        # Auto-generated types
└── handlers/         # Domain-organized procedures
    ├── app.ts        # Shell data, app-level procedures
    ├── auth.ts       # Authentication procedures
    ├── form.ts       # Form handling with Zod validation
    ├── user.ts       # User management
    ├── job.ts        # Job queue management
    └── [domain].ts   # Your domain handlers
```

## Procedure Types

```typescript
import { baseProcedure, publicProcedure, authedProcedure, adminProcedure } from "@/rpc/base";

// baseProcedure - Base with rate limiting
// publicProcedure - Same as base (alias)
// authedProcedure - Requires valid session
// adminProcedure - Requires admin role
```

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
  // ... existing handlers
  product: base.router({
    list: listProducts,
    delete: deleteProduct,
  }),
});
```

## Client Usage

### In Route Loaders

```typescript
export const Route = createFileRoute("/products")({
  loader: async ({ context }) => {
    context.queryClient.prefetchQuery(
      orpc.product.list.queryOptions({ input: { page: 1 } })
    );
    return { app: context.shell.app };
  },
});
```

### In Components

```typescript
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";

function ProductList() {
  // Queries
  const { data, refetch } = useSuspenseQuery(
    orpc.product.list.queryOptions({ input: { page: 1 } })
  );

  // Mutations
  const deleteMutation = useMutation(
    orpc.product.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Product deleted");
        refetch(); // Refresh list
      },
    })
  );

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id });
  };
}
```

## Context Available in Handlers

```typescript
interface ProcedureContext {
  repos: Repositories;      // Database repositories
  user?: User;              // Authenticated user (authedProcedure/adminProcedure)
  session?: Session;        // Session data
  db: DB;                   // Direct Kysely access (prefer repos)
  headers: Headers;         // HTTP request headers
  auth: ServerAuth;         // Authentication service
  waitUntil: (promise: Promise<unknown>) => void;  // Background task execution
}
```

## Background Tasks with waitUntil

For lightweight background tasks that don't require persistence or complex error handling, use `waitUntil` to run work after the response is sent:

```typescript
export const createOrder = authedProcedure
  .input(orderSchema)
  .handler(async ({ input, context }) => {
    const { repos, waitUntil, user } = context;

    // Return response immediately
    const order = await repos.order.create({
      userId: user.id,
      items: input.items,
      status: "pending",
    });

    // Run these after response is sent (non-blocking)
    waitUntil(sendOrderConfirmationEmail(user.email, order));
    waitUntil(updateInventory(input.items));
    waitUntil(
      fetch("https://analytics.example.com/track", {
        method: "POST",
        body: JSON.stringify({ event: "order_created", orderId: order.id })
      })
    );

    return { orderId: order.id };
  });
```

### waitUntil vs Job Queue

| Feature | waitUntil | Job Queue |
|---------|-----------|-----------|
| **Execution** | After response | Queued & persistent |
| **Persistence** | No - lost if server crashes | Yes - database backed |
| **Retries** | No | Yes - automatic retries |
| **Scheduling** | No | Yes - schedule future execution |
| **Priority** | No | Yes - priority-based |
| **Progress Tracking** | No | Yes - real-time progress (0-100%) |
| **Use Cases** | Analytics, webhooks, minor tasks | Exports, emails, reports |
| **Guarantee** | Best-effort only | Reliable execution |

**Use waitUntil for:**
- Analytics tracking
- Webhook notifications
- Cache invalidation
- Minor cleanup tasks
- Optional features

**Use Job Queue for:**
- Long-running tasks (see [docs/job-queue-worker.md](job-queue-worker.md))
- Tasks that must complete reliably
- Scheduled/delayed execution
- Tasks with progress tracking
- User-facing operations

### Runtime Support

- **Production (Cloudflare Workers, etc.)**: Uses native `waitUntil()` API
- **Development (Node/Vite)**: Promises are collected and awaited after response
- Multiple `waitUntil` calls stack into a promise pool

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

    return context.repos.product.updateById({
      id: input.id,
      data: input.data
    });
  });
```

## oRPC Client Setup

The client is configured in `src/lib/orpc.ts`:

- **Server-side**: Direct router client with request context
- **Client-side**: HTTP client with batching at `/api/rpc`
- Uses `createIsomorphicFn()` for SSR/CSR compatibility

```typescript
import { rpcClient, orpc } from "@/lib/orpc";

// rpcClient - Direct client for programmatic use
// orpc - TanStack Query utilities (queryOptions, mutationOptions)
```
