# Shell SPA Architecture

**For Agents**: Read this doc when you need to understand the overall project architecture.

---

## Shell SPA Pattern

**SSR (Server-Side Rendered)**: Authentication, app settings, user preferences, minimal shell UI
**SPA (Single Page Application)**: Routing, data fetching, state management, UI rendering

### How It Works

1. User request hits root route
2. Shell data is SSR'd (app settings, public info)
3. User data is prefetched non-blocking
4. Shell renders, client hydration occurs
5. SPA takes over for navigation

### Key Files

- `src/routes/__root.tsx` - Shell pattern implementation
- `src/rpc/handlers/app.ts` - Shell data structure
- `src/lib/queries.ts` - Query options for shell data

---

## Authentication Flow

Protected routes are handled by layout routes:

### User Routes

`src/routes/(user)/route.tsx`:
- Validates user via React Query
- Redirects to `/login` if not authenticated
- Passes type-safe user data to children

### Admin Routes

`src/routes/admin/route.tsx`:
- Validates admin role via React Query
- Redirects if not admin

---

## Environment Configuration

Type-safe env vars in `src/env/`:

- `client.ts` - Client variables (`VITE_` prefix)
- `server.ts` - Server variables with Zod validation

Both use `@t3-oss/env-core` for type safety and runtime validation.

---

## Performance Optimizations

- **React Query Caching**: 2-minute stale time
- **Auth Cookie Cache**: 5-minute server-side cache
- **Intent-based Preloading**: Faster navigation
- **React Compiler**: Automatic memoization
- **SSR-Query Integration**: Optimal data fetching
