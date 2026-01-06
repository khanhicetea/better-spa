# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Shell SPA Pattern

This is a **Shell SPA** boilerplate that implements the optimal balance between SSR and SPA:
- **SSR the shell**: Authentication, app settings, user preferences, minimal UI structure
- **SPA everything else**: All routing, data fetching, state management, and interactivity happen client-side

The pattern is implemented in `src/routes/__root.tsx` where the shell data is fetched via RPC with React Query caching during SSR, then the client takes over for all subsequent navigation.

**Important**: This project uses **oRPC** (not tRPC), so don't confuse the two.

## Common Commands

```bash
# Development
pnpm dev                    # Start dev server on port 3000
pnpm build                  # Build for production
pnpm preview                # Preview production build (requires .env file)
pnpm start                  # Start production server

# Code Quality
pnpm check                  # Format, lint, and type-check (runs all three sequentially)
pnpm format                 # Format with Biome
pnpm lint                   # Lint with Biome
pnpm check-types            # TypeScript type checking

# Database (Kysely)
pnpm db:migrate up          # Run next migration
pnpm db:migrate down        # Undo last migration
pnpm db:migrate latest      # Update to latest schema
pnpm db:migrate list        # List migrations
pnpm db:migrate make <name> # Create new migration
pnpm db:migrate rollback    # Rollback all migrations

# Authentication (Better Auth)
pnpm auth:secret            # Generate auth secret for .env
pnpm auth:generate          # Generate types from auth config

# UI Components (shadcn/ui)
pnpm ui add <component>     # Add shadcn/ui component

# Dependencies
pnpm deps                   # Update dependencies (interactive)
pnpm deps:major             # Update to major versions (interactive)

# Background Jobs (Job Queue Worker)
pnpm worker                 # Start background job worker (development)
pnpm worker:dev             # Start worker in development mode
pnpm worker:build           # Build worker for production
pnpm worker:start           # Start production worker
```

## Essential Rules

### Code Style & Security
- Follow existing code conventions and patterns
- Use TypeScript for type safety
- **NEVER** expose or log secrets and keys
- **NEVER** commit secrets or keys to the repository

### Testing
- **NO TESTING IF NO MENTIONED TESTING**
- Run `pnpm check` after finishing requested task for confirmation

### Data & Database
- All server data operations **must** go through the RPC layer
- Use the Repository pattern for all DB operations
- **NO OPTIMISTIC UPDATES**: Use pessimistic updates or concurrent-safe strategies to avoid inconsistencies

### Date & Time Handling

**Best Practices**:
- **Database**: All timestamp columns use `timestamptz` (TIMESTAMP WITH TIME ZONE) - stores UTC internally
- **Server**: Always work in UTC, use `Date.toISOString()` for server communication
- **Frontend**: Use utilities from `src/lib/utils/date.ts` for timezone-aware formatting

**Available Utilities** (`src/lib/utils/date.ts`):
```typescript
import { formatDate, formatRelativeTime, formatSmart } from "@/lib/utils/date";

// Format with custom format: "Jan 6, 2026 3:45 PM"
formatDate(date, "MMM d, yyyy h:mm a")

// Relative time: "2 hours ago", "in 3 days"
formatRelativeTime(date)

// Smart display: "Today at 3:45 PM", "Yesterday at...", or full date
formatSmart(date)

// Time only: "3:45 PM"
formatTime(date)

// Date only: "Jan 6, 2026"
formatDateOnly(date)
```

### Background Tasks
- **ALWAYS** use the job queue system for background tasks (exports, reports, emails, etc.)
- **NEVER** execute long-running tasks directly in RPC handlers
- See **[Job Queue Worker Documentation](docs/job-queue-worker.md)** for complete guide
- Jobs provide: type safety, retry logic, progress tracking, priority queue, scheduling

## Architecture

### Core Stack
- **TanStack Start**: Full-stack React framework with SSR
- **TanStack Router**: File-based routing with type safety
- **TanStack Query**: Server state management with caching
- **oRPC**: Type-safe RPC layer (mobile/native ready)
- **Better Auth**: Cookie-based authentication
- **Kysely**: Type-safe SQL query builder with PostgreSQL
- **Job Queue Worker**: PostgreSQL-backed background task system with priority & scheduling
- **React 19**: With React Compiler for automatic memoization (no need for useCallback, useMemo, memo)
- **shadcn/ui**: Accessible component library
- **Tailwind CSS v4**: Utility-first styling

### Request Flow

1. **Server Entry** (`src/server.ts`):
   - NodeJS runtime uses `createNodeHandler` from `src/server/node-server.ts`
   - Cloudflare Worker runtime available via `createCloudflareHandler` (commented out)

2. **Request Context** (`src/server/context.ts`):
   - Uses `AsyncLocalStorage` to provide request-scoped context
   - Each request gets: `headers`, `db`, `auth`, `session`, `repos`
   - Access via helpers: `getCurrentDB()`, `getCurrentAuth()`, `getCurrentSession()`, `getCurrentRepos()`, `getRequestHeaders()`

3. **Shell Pattern** (`src/routes/__root.tsx`):
   - `beforeLoad`: Fetches shell data via `shellQueryOptions()` on SSR
   - Shell data includes: app metadata, theme, environment
   - User data prefetched but not awaited (non-blocking)
   - Client hydrates and SPA takes over

4. **Protected Routes**:
   - User routes: `src/routes/(user)/route.tsx` - Redirects to `/login` if not authenticated
   - Admin routes: `src/routes/admin/route.tsx` - Requires admin role
   - Both use `beforeLoad` to validate and return non-null user type for child routes

### Environment Configuration

Type-safe environment variables in `src/env/`:
- `client.ts`: Client-side variables with `VITE_` prefix
- `server.ts`: Server-side variables with Zod validation
- Both use `@t3-oss/env-core` for type safety and runtime validation

Required variables (see `.env.example`):
```env
VITE_BASE_URL=http://localhost:3000
DATABASE_URL="postgresql://user:password@localhost:5432/postgres"
BETTER_AUTH_SECRET=<generate with pnpm auth:secret>
```

OAuth callback URLs: `http://localhost:3000/api/auth/callback/<provider>`

### RPC Architecture

**Location**: `src/rpc/`

- **`router.ts`**: Main router that imports all handler modules
- **`base.ts`**: Base procedures with context typing and error definitions
  - `baseProcedure`: Base with rate limiting
  - `publicProcedure`: Same as base
  - `authedProcedure`: Requires authentication
  - `adminProcedure`: Requires admin role
- **`handlers/`**: RPC procedure implementations organized by domain
  - `app.ts`: Shell data and application-level procedures
  - `auth.ts`: Authentication procedures
  - `form.ts`: Form handling with Zod validation
  - `user.ts`: User-related procedures
- **`types.ts`**: Auto-generated types for RPC inputs/outputs
- **`middlewares.ts`**: Authentication and rate limiting middleware

**Client Setup** (`src/lib/orpc.ts`):
- Uses `createIsomorphicFn()` for server/client rendering
- Server: Direct router client with request context
- Client: HTTP client with batching plugin at `/api/rpc`
- Exported as `rpcClient` for usage across app
- Also exports `orpc` utils from `@orpc/tanstack-query`

**Adding New RPC Procedures**:
1. Create handler in `src/rpc/handlers/<domain>.ts`
2. Export from `src/rpc/router.ts`
3. Use in route loader/beforeLoad via `context.rpcClient`
4. Use in component via `useQuery(orpc.<domain>.<action>.queryOptions(...))` and `useMutation(orpc.<domain>.<action>.mutationOptions(...))`

### Database & Repository Pattern

**Location**: `src/lib/db/`

- **`init.ts`**: Database initialization with Kysely and PostgreSQL
- **`schema/`**: Database schema types (auto-generated)
  - `auth.ts`: Authentication tables (user, session, account, verification)
  - `todo.ts`: Feature tables (todoCategory, todoItem)
  - `index.ts`: Central Database interface
  - Each schema exports: `Table`, `Selectable`, `Insertable`, `Updateable` types
- **`migrations/`**: Kysely migrations (format: `YYYY-MM-DD_HH-MM_<description>.ts`)
- **`repositories/`**: Data access layer with type-safe queries
  - `base.ts`: BaseRepository class with common methods
  - `index.ts`: Exports `createRepos()` factory
  - `*.repo.ts`: Domain-specific repositories

**Repository Pattern Guidelines**:

All database operations should go through repositories available in RPC handlers via `context.repos`.

**BaseRepository Methods**:
- `find(conditions?)` - Find multiple records
- `findSelect(columns, conditions?)` - Find with specific columns only
- `findById(id)` - Find by ID
- `findByIdOrFail(id)` - Find by ID or throw NotFoundError
- `findOne(conditions)` - Find single record
- `findOneOrFail(conditions)` - Find single or throw NotFoundError
- `findAll()` - Get all records
- `findPaginated(page, pageSize, conditions?)` - Paginated results
- `count(conditions?)` - Count records
- `exists(id)` - Check if exists by ID
- `existsBy(conditions)` - Check if any match
- `deleteById(id)` - Delete by ID
- `deleteMany(conditions)` - Delete multiple
- `updateById(id, data)` - Update by ID
- `updateMany(conditions, data)` - Update multiple
- `insertReturn(data)` - Insert and return record
- `insertMany(data[])` - Insert multiple and return
- `upsert(data, conflictColumns, updateData?)` - Insert or update on conflict

**Query Conditions** - Two types supported:

1. Simple object (partial matches):
```typescript
const users = await repos.user.find({ email: "test@test.com", role: "admin" });
```

2. Query builder function (complex queries):
```typescript
const users = await repos.user.find((qb) =>
  qb
    .where("email", "=", "test@test.com")
    .where("role", "=", "admin")
    .orderBy("createdAt", "desc")
    .limit(10)
);
```

**Repository Design Guidelines**:

- **DON'T** create simple one-line wrapper methods like `findByUser`, `findByCategoryId`
- **DON'T** pollute repositories with methods that just call BaseRepository methods with simple arguments
- **DO** only create custom methods when:
  - Implementation is more than 3 lines of logic
  - Logic is complex or involves multiple operations
  - Logic is reused in multiple places

Good example:
```typescript
export class ProductRepository extends Repository<"product"> {
  async searchByKeyword(keyword: string) {
    return this.find((qb) =>
      qb
        .where("name", "ilike", `%${keyword}%`)
        .orWhere("description", "ilike", `%${keyword}%`)
        .orderBy("popularity", "desc")
        .limit(50)
    );
  }
}
```

Bad example:
```typescript
// DON'T DO THIS - too simple, just use find directly
async findByUserId(userId: string) {
  return this.find({ userId });
}
```

**Cross-Repository Access**: Repositories can access other repositories via `this.repos` for operations spanning multiple tables.

**Using Repositories in RPC**:
```typescript
export const listUsers = adminProcedure
  .input(z.object({ page: z.number().int().positive() }))
  .handler(async ({ input, context }) => {
    const { repos } = context;
    const result = await repos.user.findPaginated(input.page, 10, (qb) =>
      qb.orderBy("createdAt", "desc")
    );
    return result;
  });
```

### Job Queue System

**IMPORTANT**: For background tasks, exports, reports, emails, or any long-running operation, **ALWAYS use the job queue system**.

**Complete Documentation**: See **[docs/job-queue-worker.md](docs/job-queue-worker.md)** for comprehensive guide.

**Quick Example**:

```typescript
// 1. Define job handler (src/worker/handlers/export-data.ts)
import { workerProcedure } from "../base";
import { z } from "zod";

export default workerProcedure
  .input(z.object({ userId: z.string() }))
  .handler(async ({ input, context }) => {
    const { userId } = input;
    const { repos, updateProgress } = context;

    await updateProgress(10);
    const data = await repos.todoItem.find({ userId });
    await updateProgress(50);
    const exportData = transformData(data);
    await updateProgress(100);

    return { exportedAt: new Date().toISOString(), count: data.length };
  });

// 2. Register in worker router (src/worker/rpc.ts)
export const workerRpc = {
  export_data: exportDataJob,
} as const;

// 3. Create job in RPC handler (src/rpc/handlers/export.ts)
import { createJobFactory, JobPriority } from "@/worker";

const createExportJob = createJobFactory("export_data");

export const startExport = authedProcedure.handler(async ({ context }) => {
  return createExportJob(
    context.repos,
    context.user.id,
    { userId: context.user.id },
    { priority: JobPriority.HIGH }
  );
});

// 4. Use in UI
const exportMutation = useMutation(
  orpc.export.startExport.mutationOptions({
    onSuccess: (job) => toast.success("Export started"),
  })
);
```

**Key Features**:
- ✅ Type-safe payloads and results (inferred from handlers)
- ✅ Priority queue (LOW, NORMAL, HIGH, URGENT)
- ✅ Scheduled jobs (runAt: Date)
- ✅ Progress tracking (0-100%)
- ✅ Automatic retry with configurable max attempts
- ✅ Type guards for status checking
- ✅ React hooks with smart polling

**Running Worker**:
- Development: `pnpm worker` or `pnpm worker:dev`
- Production: `pnpm worker:build` then `pnpm worker:start`

**Production Build**:
The worker uses `tsup` to compile TypeScript into a production-ready JavaScript bundle:
- Entry: `scripts/worker.ts`
- Output: `.output/worker/worker.js` (minified, bundled)
- Config: `tsup.config.ts`
- All dependencies bundled into single executable file

**Production Deployment**:
Run server and worker as separate processes:
```bash
# Build both
pnpm build         # Build TanStack Start server
pnpm worker:build  # Build worker

# Run in production (separate processes)
node .output/server/index.mjs    # Terminal 1 - Server
node .output/worker/worker.js    # Terminal 2 - Worker
```

**Environment Variables**:
- Development: Automatically loaded from `.env` file via `--env-file` flag
- Production: Set at system level (NODE_ENV, DATABASE_URL, etc.)

### Router Configuration & Route Organization

**Setup** (`src/router.tsx`):
- React Query integration with SSR support
- Default stale time: 5 seconds for queries
- Default garbage collection: 5 minutes
- Intent-based preloading for faster navigation
- Structural sharing enabled for optimized renders

**Query Options** (`src/lib/queries.ts`):
- `authQueryOptions()`: User session (1min stale time, refetch on window focus)
- `shellQueryOptions()`: App shell (10min stale time, no refetch)
- Use `QUERY_KEYS` constant for consistent query key naming

**Route Organization** (file-based routing in `src/routes/`):
- **`src/routes/`**: Public routes
- **`src/routes/(auth)/`**: Auth pages (login, register) - **Route Group** (pathless)
- **`src/routes/(user)/`**: Protected user routes - **Route Group** with auth guard
- **`src/routes/(user)/app/`**: Protected user app routes
- **`src/routes/admin/`**: Admin routes (path prefix: `/admin`)
- **`src/routes/(test)/`**: Test/development routes
- **`src/routes/api/`**: API endpoints (RPC handled at `/api/rpc`)
- **`src/routes/__root.tsx`**: Root layout with shell pattern

**Route Groups**: Directories wrapped in `(name)` don't add URL segments but organize routes and apply shared layouts.

### Data Fetching Pattern

1. **Prefetch in Route Loader**:
```typescript
export const Route = createFileRoute("/admin/users")({
  component: UsersPage,
  validateSearch: z.object({
    page: z.number().int().positive().catch(1),
  }),
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ deps, context }) => {
    context.queryClient.prefetchQuery(
      orpc.user.listUsers.queryOptions({ input: { page: deps.page } })
    );
    return { app: context.shell.app };
  },
});
```

2. **Consume with useSuspenseQuery**:
```typescript
function UsersPage() {
  const { app } = Route.useLoaderData();
  const page = Route.useSearch({ select: (s) => s.page });
  const { data, refetch } = useSuspenseQuery(
    orpc.user.listUsers.queryOptions({ input: { page } })
  );
  // Keep simple: use refetch instead of invalidation by key in same component
}
```

### Runtime Switching

**Important**: To switch between NodeJS and Cloudflare Worker runtimes:

1. Copy the appropriate vite config:
   - NodeJS: `vite.config.node.ts` → `vite.config.ts`
   - Cloudflare: `vite.config.cf.ts` → `vite.config.ts`

2. Update `src/server.ts`:
   - Comment/uncomment the appropriate handler import
   - Modify how `RequestContext` is created in the handler

## Development Guidelines

### New Feature Implementation Checklist

1. **Plan first, ask first, implement later**
2. Draft the DB schema changes before implementing, ask for confirmation
3. **Plan order**: DB schema → RPC handlers → Page route → UI → Check types → DONE
4. Co-locate sub-components in same file as page route if only used once
5. **Only use pagination if mentioned**
6. **Each item** should be rendered in separate component for independent mutation and status management
7. Add links:
   - App user features: `src/components/app/app-sidebar.tsx`
   - Admin features: `src/components/admin/admin-sidebar.tsx`

### Adding New Features

**Add New Pages**:
- Public: `src/routes/`
- Auth: `src/routes/(auth)/`
- Protected User: `src/routes/(user)/`
- Protected User App: `src/routes/(user)/app/`
- Admin: `src/routes/admin/`

**Add New RPC Procedures**: See RPC Architecture section above

**Add New UI Components**: `pnpm ui add <component-name>`

**Form Handling**: See demo at `src/routes/(test)/hello-form.tsx` for:
- `react-hook-form` with shadcn/ui
- `useMutation` with oRPC
- `handleFormError` utility
- Sonner toast notifications

## UI and UX Guidelines

### Style
- Use shadcn/ui components and Tailwind CSS v4
- Use theme color variables: `primary`, `secondary`, `muted`, `accent`, etc.
- **No specific colors directly without asking**

### Responsiveness
- UI should be responsive, compact, and nice

### Icons
- Buttons should have icons from Lucide
- If icon is common for its purpose, skip text label

### Forms
- Form fields should have label and error message
- Use vertical layout first with `space-y-4`

### CRUD Operations
- Use `Sheet` for adding/editing simple forms
- Use `Dialog` for deleting/confirmation

### Tables
- Use Tanstack Table with column definitions
- No sorting, no column visibility
- Row actions in last column with `justify-end`

### Empty States
- Use shadcn Empty component in `src/components/ui/empty.tsx`

## Performance Optimizations

- **React Query Caching**: Configurable stale times reduce server calls
- **Auth Cookie Cache**: Server-side caching reduces DB queries
- **Intent-based Preloading**: Faster navigation
- **React Compiler**: Automatic memoization (no manual useCallback, useMemo, memo needed)
- **SSR-Query Integration**: Optimal data fetching
- **oRPC Batching**: HTTP requests batched on client side

## Type Safety Patterns

- RPC procedures auto-generate types in `src/rpc/types.ts`
- Use `Outputs["domain"]["procedure"]` for return types
- Database types auto-generated in `src/lib/db/schema/`
- Router context fully typed with `user`, `queryClient`, `rpcClient`

## Mobile/Native Ready

- oRPC handlers in `src/rpc/` are reusable across platforms
- HTTP API available at `/api/rpc` with batching
- Type definitions can be shared with mobile apps
- No framework-specific code in RPC layer
