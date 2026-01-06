# Commands Reference

## Development

```bash
pnpm dev                    # Start dev server (port 3000)
pnpm build                  # Build for production
pnpm preview                # Preview production build
pnpm start                  # Start production server
```

## Code Quality

```bash
pnpm check                  # Format + lint + type-check (runs all)
pnpm format                 # Format with Biome
pnpm lint                   # Lint with Biome
pnpm check-types            # TypeScript type checking
```

## Database (Kysely)

```bash
pnpm kysely migrate latest  # Run all pending migrations
pnpm kysely migrate up      # Run next migration
pnpm kysely migrate down    # Undo last migration
pnpm kysely migrate list    # List migration status
pnpm kysely migrate make <name>  # Create new migration
pnpm kysely codegen         # Generate TypeScript types from DB
pnpm kysely sql "QUERY" -f json  # Run raw SQL query (debugging)
```

Note: DB uses snake_case, backend uses camelCase. Use snake_case for raw queries.

## Authentication (Better Auth)

```bash
pnpm auth:secret            # Generate auth secret for .env
pnpm auth:generate          # Generate types from auth config
```

## UI Components (shadcn/ui)

```bash
pnpm ui add <component>     # Add shadcn/ui component
```

## Dependencies

```bash
pnpm deps                   # Update dependencies (interactive, minor/patch)
pnpm deps:major             # Update including major versions
```

## Background Jobs

```bash
pnpm worker                 # Start worker (development)
pnpm worker:dev             # Start worker in dev mode
pnpm worker:build           # Build worker for production
pnpm worker:start           # Start production worker
```

## Production Deployment

```bash
# Build both server and worker
pnpm build                  # Build TanStack Start server
pnpm worker:build           # Build worker

# Run in production (separate processes)
node .output/server/index.mjs    # Server
node .output/worker/worker.js    # Worker
```
