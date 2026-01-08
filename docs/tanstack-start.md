# TanStack Start Routing Guide

**For Agents**: Read this doc when adding new pages, working with route guards, or data loading.

---

This project uses **TanStack Start** (with **TanStack Router**) for type-safe, file-based routing. The routing system handles both Server-Side Rendering (SSR) and Client-Side Rendering (SPA) transitions seamlessly.

## Project Route Structure

The routes are located in `src/routes/`. The file structure directly maps to the URL paths, with some special conventions.

```
src/routes/
├── __root.tsx              # Root route (Shell, Context Provider, HTML entry)
├── index.tsx               # Home page (/)
├── (auth)/                 # Route Group: Auth pages (pathless)
│   ├── route.tsx           # Layout for auth pages
│   ├── login.tsx           # /login
│   └── signup.tsx          # /signup
├── (user)/                 # Route Group: Protected User pages (pathless)
│   ├── route.tsx           # Auth Guard & Layout
│   ├── app/                # /app sub-routes
│   └── settings/           # /settings sub-routes
├── admin/                  # Admin pages (path prefix: /admin)
│   ├── -components/        # Added prefix "-" to skip the children route in file-routing
│   ├── route.tsx           # Admin Layout
│   └── index.tsx           # /admin
└── api/                    # API Routes
```

## Route Groups

Directories wrapped in parentheses `(name)` are **Route Groups**.

- They **do not** add segments to the URL path.
- They are useful for organizing routes and applying shared layouts or logic (like auth guards).

**Examples:**

- `src/routes/(auth)/login.tsx` -> URL: `/login`
- `src/routes/(user)/app/index.tsx` -> URL: `/app`

## Protected Routes & Auth Guards

We use the `(user)` route group to protect routes that require authentication. The protection logic is implemented in `src/routes/(user)/route.tsx`.

### `(user)/route.tsx` Implementation

This layout route checks if the user is logged in before loading any child route.

```tsx
// src/routes/(user)/route.tsx
export const Route = createFileRoute("/(user)")({
  component: UserLayout,
  beforeLoad: async ({ context }) => {
    // 1. Ensure user data is available
    const user = await context.queryClient.ensureQueryData({
      ...authQueryOptions(),
      revalidateIfStale: true,
    });

    // 2. Redirect if not authenticated
    if (!user) {
      throw redirect({ to: "/login" });
    }

    // 3. Return user context to child routes
    return { user };
  },
  ssr: "data-only", // Only fetch data on server, render on client
});
```

## Data Loading Logic

### 1. Root Shell (SSR)

The `src/routes/__root.tsx` is responsible for fetching global "Shell" data on the server.

- **`beforeLoad`**: Fetches shell config (app settings, public info) using `ensureQueryData`.
- **Prefetching**: Intentionally requests user data with `prefetchQuery` but _does not await it_. This allows the page to load instantly while user data streams in or loads on the client.

### 2. Route Loaders

Individual routes can prefetch their specific data.

```tsx
export const Route = createFileRoute("/admin/users")({
  loader: async ({ context, deps }) => {
    // Prefetch data for the route
    context.queryClient.prefetchQuery(
      orpc.user.listUsers.queryOptions({ page: deps.page }),
    );
    // Note: We often don't return data here, just prefetch into the QueryClient
  },
});
```

### 3. Client Components

Components use `useSuspenseQuery` to consume the data. If the data was prefetched (SSR or Loader), it renders immediately. If not, it suspends.

```tsx
function UsersPage() {
  // Reads from the cache populated by the loader
  const { data } = useSuspenseQuery(orpc.user.listUsers.queryOptions(...));
  // ...
}
```

## Layouts

Directory-based `route.tsx` files serve as Layouts.

- They render an `<Outlet />` where child routes will appear.
- They can provide UI shells (Sidebars, Navbars).
- They can enforce data requirements or context.

**Example: User Layout** (`src/routes/(user)/route.tsx`)

```tsx
function UserLayout() {
  return (
    <>
      <Outlet />
      <ShellProgressBar /> {/* Shows loading bar for navigations */}
    </>
  );
}
```

## API Routes

TanStack Start also supports API routes in `src/routes/api/`.
These allow defining server-side endpoints directly.

## Key Takeaways

1.  **File-System Based**: Use folders/files to define URLs.
2.  **Type-Safe**: Use `createFileRoute` for full type inference.
3.  **SSR & Hydration**: Logic in `beforeLoad` runs on the server first.
4.  **Context**: Use `context` in loaders to access `queryClient` and `rpcClient`.
