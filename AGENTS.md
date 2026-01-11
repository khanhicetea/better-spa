# AGENTS.md or CLAUDE.MD

Guidance for Coding Agents when working with this project.

---

## CRITICAL AGENT RULES (READ FIRST)

These rules differ from typical projects. **MUST follow or risk breaking the build.**

### Technology Differences

| Standard | This Project | Critical Note |
|----------|--------------|---------------|
| tRPC | **oRPC** | Completely different API. See [docs/rpc-architecture.md](docs/rpc-architecture.md) |
| Radix UI | **Base UI** (`@base-ui/react`) | Use `render` prop, NOT `asChild` |
| Manual memoization | **React Compiler** | NEVER use `useCallback`, `useMemo`, `memo` |
| Tailwind v3 | **Tailwind v4** | No specific colors (e.g., `bg-blue-500`) unless user requests |
| Testing required | **NO TESTING** | Only add tests if explicitly requested |
| DB seeding | **NO SEEDING** | Never create seed files |
| Kysely codegen | **NO CODEGEN** | Types are manually defined in `src/lib/db/schema/` |

### Base UI Render Prop Pattern (CRITICAL)

```tsx
// WRONG - Radix asChild pattern
<DialogTrigger asChild>
  <Button>Open</Button>
</DialogTrigger>

// CORRECT - Base UI render prop pattern
<DialogTrigger render={<Button />}>
  Open
</DialogTrigger>

// CORRECT - With props
<AlertDialogAction render={<Button variant="destructive" />}>
  Delete
</AlertDialogAction>
```

### React Compiler (CRITICAL)

```tsx
// WRONG - Don't do this
const handleClick = useCallback(() => { ... }, [deps]);
const computed = useMemo(() => expensive(), [deps]);
const MemoComponent = memo(Component);

// CORRECT - Just write normal code
const handleClick = () => { ... };
const computed = expensive();
function Component() { ... }
```

### Tailwind Colors (CRITICAL)

```tsx
// WRONG - Specific colors
<div className="bg-blue-500 text-white">

// CORRECT - Theme variables
<div className="bg-primary text-primary-foreground">
<div className="bg-muted text-muted-foreground">
<div className="bg-destructive text-destructive-foreground">
```

---

## Agent Workflow Rules

### Before Starting Any Task

1. **List relevant docs first**:
   ```
   Available docs:
   - docs/react-conventions.md (React JS component conventions, naming conventions)
   - docs/ui-guidelines.md (UI/forms/dialogs)
   - docs/rpc-architecture.md (RPC handlers)
   - docs/database-repository.md (DB operations)
   - docs/development-guides.md (feature implementation)
   - docs/job-queue-worker.md (background tasks)
   - docs/file-storage.md (S3/uploads)
   - docs/tanstack-start.md (routing)
   - docs/shell-spa-architecture.md (architecture)
   ```
2. **Read the relevant docs** before implementing
3. **For sub-agents**: Pass the doc paths to read in the prompt

### When to Use Plan Mode

**USE plan mode for:**
- Implementing a whole new feature (new pages, new entities)
- Major refactoring or architectural changes
- Complex bugs requiring investigation

**SKIP plan mode for:**
- Simple bug fixes
- Minor UI tweaks
- Adding fields to existing forms
- Small enhancements to existing features

**In plan mode:**
- Write the plan to the plan file BEFORE exiting
- Include DB schema changes, file changes, implementation order

### Explore Subagent Rules

When exploring codebase:
1. List directory structure first
2. Pick at least 1 existing file as reference example
3. Understand current patterns before suggesting changes

---

## Shell SPA Pattern

**SSR the shell** (auth, settings, minimal UI) + **SPA everything else** (routing, data, state).

- Implemented in `src/routes/__root.tsx`
- Uses **oRPC** (NOT tRPC)
- React Query caching during SSR, then client takes over

## Quick Commands

```bash
pnpm dev              # Dev server (port 3000)
pnpm check            # Format + lint + type-check (RUN AFTER FINISHING)
pnpm kysely migrate latest   # Run migrations
pnpm ui add <name>    # Add shadcn/ui component
pnpm worker           # Start job worker
```

Full reference: [docs/commands.md](docs/commands.md)

## Essential Rules

### Security
- **NEVER** expose/log/commit secrets and keys
- Use TypeScript for type safety

### Code Quality
- Run `pnpm check` after finishing tasks
- **NO TESTING IF NOT MENTIONED**

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
| RPC | oRPC (NOT tRPC) |
| Auth | Better Auth (cookie-based) |
| DB | Kysely + PostgreSQL |
| Jobs | PostgreSQL-backed queue |
| UI | React 19 + shadcn/ui (Base UI) + Tailwind v4 |

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
│   └── schema/       # Type definitions (manual, no codegen)
└── worker/           # Background jobs
```

## Implementation Checklist

1. **Read relevant docs first** - Check documentation table below
2. **Plan first, ask first** - Draft DB schema changes, get confirmation
3. **Order**: DB schema > RPC handlers > Page route > UI > `pnpm check`
4. Co-locate single-use components in page route file
5. Each list item: separate component for independent mutation/status
6. Add nav links: `src/components/app/app-sidebar.tsx` or `admin-sidebar.tsx`

## Detailed Documentation

| Topic | Doc | When to Read |
|-------|-----|--------------|
| Architecture | [docs/shell-spa-architecture.md](docs/shell-spa-architecture.md) | Understanding project structure |
| Routing | [docs/tanstack-start.md](docs/tanstack-start.md) | Adding pages, route guards |
| RPC Layer | [docs/rpc-architecture.md](docs/rpc-architecture.md) | Creating API endpoints |
| Database | [docs/database-repository.md](docs/database-repository.md) | DB queries, repositories |
| DB Schema | [docs/db-schema.md](docs/db-schema.md) | Understanding current schema |
| Job Queue | [docs/job-queue-worker.md](docs/job-queue-worker.md) | Background tasks |
| Feature Development | [docs/development-guides.md](docs/development-guides.md) | Full CRUD implementation |
| UI/UX | [docs/ui-guidelines.md](docs/ui-guidelines.md) | Forms, dialogs, tables |
| Utilities | [docs/utilities.md](docs/utilities.md) | Date, lodash utils |
| File Storage | [docs/file-storage.md](docs/file-storage.md) | S3, file uploads |
| Commands | [docs/commands.md](docs/commands.md) | Available CLI commands |
| DevOps | [docs/devops.md](docs/devops.md) | Deployment |
| Cloudflare | [docs/cloudflare.md](docs/cloudflare.md) | Cloudflare Workers |

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

### Background Tasks

```typescript
// Use waitUntil for lightweight tasks (analytics, webhooks, cache updates)
export const createProduct = authedProcedure
  .input(productSchema)
  .handler(async ({ input, context }) => {
    const product = await context.repos.product.create(input);

    // Non-blocking background tasks
    context.waitUntil(trackAnalytics({ event: "product_created" }));
    context.waitUntil(invalidateCache("products"));
    context.waitUntil(sendWebhook({ type: "product.created", product }));

    return product;
  });

// Use Job Queue for long-running, persistent tasks (see docs/job-queue-worker.md)
// Examples: exports, emails, reports - tasks that need retries & scheduling
```

### Environment Variables

```env
VITE_BASE_URL=http://localhost:3000
DATABASE_URL="postgresql://user:password@localhost:5432/postgres"
BETTER_AUTH_SECRET=<pnpm auth:secret>
```

Type-safe env in `src/env/client.ts` and `src/env/server.ts`.
