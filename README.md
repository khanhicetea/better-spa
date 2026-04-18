# Shell SPA Boilerplate

A minimal starter template that implements the **Shell SPA** pattern - the perfect balance between SSR and SPA for optimal UX and DX.

## 🎯 Philosophy

> "The good balance between SSR and SPA is the best stack for UX and DX. Only SSR a shell for SPA (server rendering should check auth, and populate app settings + user settings and pass it into the shell). Everything else, user can wait for first-load."

## 🚀 Shell SPA Pattern

### What gets SSR'd (Server-Side Rendered)

- **Authentication**: User session validation
- **App Settings**: Configuration, feature flags, environment info
- **User Preferences**: Theme, language, layout preferences
- **Minimal Shell UI**: Basic HTML structure and critical data and CSS

### What runs as SPA (Single Page Application)

- **Routing & Navigation**: All client-side routing
- **Data Fetching**: API calls via oRPC
- **State Management**: React Query for client-side state
- **UI Rendering**: All interactive components
- **Everything Else**: Users can wait for first-load

## 🔧 Tech Stack

### Core Framework

- **TanStack Start** - Full-stack React framework
- **TanStack Router** - Type-safe routing
- **TanStack Query** - Server state management
- **React 19** - Latest React with concurrent features
- **oRPC** - Type-safe RPC for API (mobile/native ready)

### Authentication

- **Better Auth** - Modern auth with cookie sessions
- **Email/Password** - Built-in authentication
- **Cookie Caching** - Reduced database calls

### Database

- **Kysely** - Type-safe SQL query builder
- **PostgreSQL** - Production-ready database
- **SQLite** - Local development (file-based)

### UI & Styling

- **shadcn/ui** - Accessible component library
- **Tailwind CSS v4** - Utility-first styling
- **Radix UI** - Unstyled primitives
- **Lucide React** - Icon library

## 📁 Project Structure

```
shell-spa/
├── src/
│   ├── components/          # Reusable UI components
│   ├── lib/                 # Core utilities
│   │   ├── auth/            # Authentication setup
│   │   ├── db/              # Database configuration
│   │   └── orpc.ts          # RPC client setup
│   ├── routes/             # File-based routing
│   │   ├── (auth)/          # Public auth pages
│   │   ├── (user)/          # Protected routes
│   │   ├── (test)/          # Test routes
│   │   ├── api/             # API endpoints
│   │   └── __root.tsx       # Shell implementation
│   └── rpc/                # RPC procedures
├── public/                 # Static assets
└── kysely/                 # Database migrations
```

## 🔑 Key Features

### 1. Shell Pattern Implementation

**`src/routes/__root.tsx`** - The heart of the shell pattern:

```typescript
// Shell data is fetched via RPC and cached with React Query
beforeLoad: async ({ context }) => {
  // SSR shell data via RPC with React Query caching
  const shell = await context.queryClient.ensureQueryData(shellQueryOptions());

  // Prefetch user data but don't await it - let client handle it
  context.queryClient.setQueryData(authQueryOptions().queryKey, shell.user);

  return { shell };
};
```

The shell data structure is defined in `src/rpc/handlers/app.ts`:

```typescript
export const shellData = baseProcedure.handler(async ({ context }) => {
  return {
    app: {
      name: "Shell SPA",
      version: "1.0.0",
      environment: process.env.NODE_ENV === "production" ? "production" : "development",
      theme: getCookie("theme") || "system",
    },
    user: context.session?.user || null,
  };
});
```

And the query options are defined in `src/lib/queries.ts`:

```typescript
export const shellQueryOptions = () =>
  queryOptions({
    queryKey: ["shell"],
    queryFn: async ({ signal }) => {
      const shellData = await rpcClient.app.shellData({}, { signal });
      return shellData;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - shell data doesn't change often
  });
```

### 2. Authentication Flow

```mermaid
graph TD
  A[User Request] --> B[Root Route]
  B --> C[SSR Shell Data]
  C --> D[Prefetch User non-blocking]
  D --> E[Render Shell]
  E --> F[Client Hydration]
  F --> G[SPA Takes Over]
```

### 3. Router Configuration

The router is configured in `src/router.tsx` with:

- **React Query Integration**: For data fetching and caching
- **SSR-Query Integration**: For server-side rendering with query support
- **Default Error Handling**: Custom catch boundary and not found components
- **Scroll Restoration**: Automatic scroll position management
- **Structural Sharing**: Optimized component rendering

Key configuration:

```typescript
// src/router.tsx
const router = createRouter({
  routeTree,
  context: {
    queryClient,
    rpcClient,
    user: null,
  },
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
  defaultErrorComponent: DefaultCatchBoundary,
  defaultNotFoundComponent: DefaultNotFound,
  scrollRestoration: true,
  defaultStructuralSharing: true,
});

setupRouterSsrQueryIntegration({
  router,
  queryClient,
  handleRedirects: true,
  wrapQueryClient: true,
});
```

### 4. Protected Routes

```typescript
// src/routes/(user)/route.tsx
beforeLoad: async ({ context }) => {
  const user = await context.queryClient.ensureQueryData({
    ...authQueryOptions(),
    revalidateIfStale: true,
  });

  if (!user) {
    throw redirect({ to: "/login" });
  }

  return { user }; // Type-safe user in child routes
};
```

## 🚀 Getting Started

### Prerequisites

- Node.js 24+
- pnpm (recommended)
- PostgreSQL (or SQLite for development)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-repo/shell-spa.git
cd shell-spa

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env

# Generate auth secret
pnpm auth:secret

# Start development server
pnpm dev
```

### Database Setup

```bash
# Generate migrations
pnpm db generate

# Push schema to database
pnpm db push

# Open Kysely Studio (GUI)
pnpm db studio
```

## JS runtimes:
- NodeJS 24+ runtime : use copy `vite.config.node.ts` into `vite.config.ts`
- Cloudflare Worker runtime : use copy `vite.config.cf.ts` into `vite.config.ts`

**Important** : modify `src/server.ts` to use `createCloudflareHandler` or `createNodeHandler`, and dive into the code for modify the how `RequestContext` is created, and passing global variables into a `AsyncLocalStorage` instance in `src/server/context.ts`

## 📱 Mobile/Native Ready

The **oRPC** setup is designed for reuse in mobile and native apps:

```typescript
// Shared RPC procedures in src/rpc/
// Can be imported and used in:
// - React Native apps
// - Mobile apps (via HTTP client)
// - Native desktop apps
// - Other frontend frameworks

export const rpcRouter = {
  user: {
    getCurrentUser: baseProcedure.handler(async ({ context }) => {
      return context.session?.user || null;
    }),
  },
  // Add your app-specific procedures here
};
```

## 🎨 Customization

### Add New Pages

1. **Public Page**: Add to `src/routes/`
2. **Protected Page**: Add to `src/routes/(user)/`
3. **Test Page**: Add to `src/routes/(test)/`

### Add New RPC Procedures

1. Create procedure in `src/rpc/`
2. Add to router in `src/rpc/router.ts`
3. Use in components via `rpcClient`

### Add New UI Components

```bash
pnpm ui add component-name
```

## 🔧 Configuration

### Environment Variables

```env
# .env file
VITE_BASE_URL=http://localhost:3000
DATABASE_URL="./sqlite.db"  # or postgres://user:pass@localhost:5432/db
BETTER_AUTH_SECRET=your-secret-here
```

### Theme Customization

Edit `src/styles.css` for global styles and Tailwind configuration.

## 📊 Performance Optimizations

- **React Query Caching**: 2-minute stale time reduces server calls
- **Auth Cookie Cache**: 5-minute server-side cache reduces DB queries
- **Intent-based Preloading**: Faster navigation
- **React Compiler**: Automatic memoization
- **SSR-Query Integration**: Optimal data fetching

## 🎯 When to Use This Boilerplate

✅ **App-type websites** (vs document-type websites)

✅ **Projects needing auth + protected routes**

✅ **Applications that may need mobile/native versions later**

✅ **Teams wanting clean separation between SSR shell and SPA**

✅ **Projects requiring type safety throughout the stack**

## 🚫 When NOT to Use This Boilerplate

❌ **Static websites** (use Next.js, Astro, etc.)

❌ **Content-heavy sites** (use traditional SSR)

❌ **Simple landing pages** (overkill for basic sites)

## 📚 Learning Resources

- [TanStack Start Docs](https://tanstack.com/start/latest)
- [oRPC Documentation](https://orpc.dev/)
- [Better Auth Docs](https://www.better-auth.com/)
- [Kysely Docs](https://kysely.dev/)

## 🤝 Contributing

This boilerplate is designed to be minimal and opinionated. Feel free to:

- Add your own components
- Extend the RPC procedures
- Customize the authentication flow
- Adapt the shell pattern to your needs

## 📝 License

> "Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away." - Antoine de Saint-Exupéry

This boilerplate embodies that philosophy - minimal, focused, and ready for your app development.
