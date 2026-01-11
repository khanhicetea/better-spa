# Shell SPA Architecture

**For Agents**: Read this doc when you need to understand the overall project architecture.

---

## Key Concepts

### Shell SPA Pattern

- **SSR (Server-Side Rendered)**: Authentication, app settings, user preferences, minimal shell UI
- **SPA (Single Page Application)**: Routing, data fetching, state management, UI rendering

### Core Technologies

- **TanStack Start**: Full-stack React framework
- **TanStack Router**: Type-safe routing
- **TanStack Query**: Server state management
- **oRPC**: Type-safe RPC for API (oRPC, not tRPC so don't make mistakes here)
- **Better Auth**: Modern authentication
- **Kysely**: Type-safe SQL query builder
- **shadcn/ui**: Accessible component library

## Shell Implementation

The shell pattern is implemented in `src/routes/__root.tsx` with the following key aspects:

- Shell data is fetched via RPC and cached with React Query
- User data is prefetched but not awaited, allowing the client to handle it
- The shell data structure includes app settings and user information

### Relevant Files

- `src/routes/__root.tsx`: Core shell pattern implementation
- `src/rpc/handlers/app.ts`: Shell data structure definition
- `src/lib/queries.ts`: Query options for shell data

## Authentication Flow

1. User request hits the root route
2. Shell data is SSR'd
3. User data is prefetched non-blocking
4. Shell is rendered
5. Client hydration occurs
6. SPA takes over

## Protected Routes

Protected routes (user role) are handled in `src/routes/(user)/route.tsx` with:

- User validation via React Query
- Redirect to login if user is not authenticated
- Type-safe user data passed to child routes

Protected admin routes (admin role) are handled in `src/routes/admin/route.tsx` with:

- Admin validation via React Query

## Environment Configuration

Type-safe environment variables are configured in `src/env/`:

- `client.ts`: Client-side environment variables with `VITE_` prefix
- `server.ts`: Server-side environment variables with Zod validation
- Both use `@t3-oss/env-core` for type safety and runtime validation
- Client variables are prefixed with `VITE_` for security

## Performance Optimizations

- **React Query Caching**: 2-minute stale time reduces server calls
- **Auth Cookie Cache**: 5-minute server-side cache reduces DB queries
- **Intent-based Preloading**: Faster navigation
- **React Compiler**: Automatic memoization, so no need manually useCallback, useMemo, memo things.
- **SSR-Query Integration**: Optimal data fetching
