# CLAUDE.md

Guidance for Claude Code when working with this Shell SPA boilerplate.

## Shell SPA Pattern

**SSR the shell** (auth, settings, minimal UI) + **SPA everything else** (routing, data, state).

- Implemented in `src/routes/__root.tsx`
- Uses **oRPC** (NOT tRPC)
- React Query caching during SSR, then client takes over

## Quick Commands

```bash
pnpm dev              # Dev server (port 3000)
pnpm check            # Format + lint + type-check
pnpm kysely migrate latest   # Run migrations
pnpm kysely codegen   # Generate DB types
pnpm ui add <name>    # Add shadcn/ui component
pnpm worker           # Start job worker
```

Full reference: [docs/commands.md](docs/commands.md)

## Essential Rules

### Security
- **NEVER** expose/log/commit secrets and keys
- Use TypeScript for type safety

### Testing
- **NO TESTING IF NOT MENTIONED**
- Run `pnpm check` after finishing tasks

### Data & Database
- All server data operations through RPC layer
- Use Repository pattern for DB operations
- **NO OPTIMISTIC UPDATES** - use pessimistic or concurrent-safe strategies
- After new migration, update [docs/db-schema.md](docs/db-schema.md)

### Background Tasks
- **ALWAYS** use job queue for long-running tasks (exports, emails, reports)
- **NEVER** run long tasks directly in RPC handlers
- See [docs/job-queue-worker.md](docs/job-queue-worker.md)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | TanStack Start (SSR) |
| Routing | TanStack Router (file-based) |
| State | TanStack Query |
| RPC | oRPC |
| Auth | Better Auth (cookie-based) |
| DB | Kysely + PostgreSQL |
| Jobs | PostgreSQL-backed queue |
| UI | React 19 + shadcn/ui + Tailwind v4 |

React Compiler enabled - no manual useCallback/useMemo/memo needed.

## Project Structure

```
src/
├── routes/           # File-based routing
│   ├── __root.tsx    # Shell pattern
│   ├── (auth)/       # Auth pages (pathless group)
│   ├── (user)/       # Protected user routes
│   └── admin/        # Admin routes (/admin prefix)
├── rpc/              # Type-safe RPC
│   ├── handlers/     # Domain procedures
│   └── router.ts     # Main router
├── lib/db/           # Database layer
│   ├── repositories/ # Data access
│   └── schema/       # Type definitions
└── worker/           # Background jobs
```

## Implementation Checklist

1. **Plan first, ask first** - Draft DB schema changes, get confirmation
2. **Order**: DB schema > RPC handlers > Page route > UI > `pnpm check`
3. Co-locate single-use components in page route file
4. Each list item: separate component for independent mutation/status
5. Add nav links: `src/components/app/app-sidebar.tsx` or `admin-sidebar.tsx`

## Detailed Documentation

| Topic | Doc |
|-------|-----|
| Architecture | [docs/shell-spa-architecture.md](docs/shell-spa-architecture.md) |
| Routing | [docs/tanstack-start.md](docs/tanstack-start.md) |
| RPC Layer | [docs/rpc-architecture.md](docs/rpc-architecture.md) |
| Database | [docs/database-repository.md](docs/database-repository.md) |
| DB Schema | [docs/db-schema.md](docs/db-schema.md) |
| Job Queue | [docs/job-queue-worker.md](docs/job-queue-worker.md) |
| Feature Development | [docs/development-guides.md](docs/development-guides.md) |
| UI/UX | [docs/ui-guidelines.md](docs/ui-guidelines.md) |
| Utilities | [docs/utilities.md](docs/utilities.md) |
| File Storage | [docs/file-storage.md](docs/file-storage.md) |
| Commands | [docs/commands.md](docs/commands.md) |
| DevOps | [docs/devops.md](docs/devops.md) |
| Cloudflare | [docs/cloudflare.md](docs/cloudflare.md) |

## Quick Reference

### Add RPC Procedure

```typescript
// 1. Create handler (src/rpc/handlers/product.ts)
export const listProducts = authedProcedure
  .input(z.object({ page: z.number() }))
  .handler(async ({ input, context }) => {
    return context.repos.product.findPaginated({ page: input.page, pageSize: 20 });
  });

// 2. Register (src/rpc/router.ts)
product: base.router({ list: listProducts })

// 3. Use in component
const { data } = useSuspenseQuery(orpc.product.list.queryOptions({ input: { page: 1 } }));
```

### Repository Usage

```typescript
// Simple queries - use base methods directly
const items = await repos.product.find({ categoryId: "123" });
const item = await repos.product.findByIdOrFail(id);

// Complex queries - use query builder
const results = await repos.product.find({
  where: (qb) => qb.where("price", ">", 100).where("stock", ">", 0),
  modify: (qb) => qb.orderBy("createdAt", "desc").limit(20)
});
```

### Data Fetching Pattern

```typescript
// Route loader - prefetch
loader: async ({ context }) => {
  context.queryClient.prefetchQuery(orpc.product.list.queryOptions({ input: { page: 1 } }));
}

// Component - consume
const { data, refetch } = useSuspenseQuery(orpc.product.list.queryOptions({ input: { page } }));
```

### Environment Variables

```env
VITE_BASE_URL=http://localhost:3000
DATABASE_URL="postgresql://user:password@localhost:5432/postgres"
BETTER_AUTH_SECRET=<pnpm auth:secret>
```

Type-safe env in `src/env/client.ts` and `src/env/server.ts`.
