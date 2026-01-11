# CLAUDE.md

Guidance for Coding Agents when working with this project.

---

## CRITICAL RULES (READ FIRST)

These rules differ from typical projects. **MUST follow or risk breaking the build.**

### Technology Differences

| Standard | This Project | Critical Note |
|----------|--------------|---------------|
| tRPC | **oRPC** | Completely different API |
| Radix UI | **Base UI** (`@base-ui/react`) | Use `render` prop, NOT `asChild` |
| Manual memoization | **React Compiler** | NEVER use `useCallback`, `useMemo`, `memo` |
| Tailwind v3 | **Tailwind v4** | Use theme variables (e.g., `bg-primary`), not specific colors (e.g., `bg-blue-500`) |
| Testing required | **NO TESTING** | Only add tests if explicitly requested |
| DB seeding | **NO SEEDING** | Never create seed files |
| Kysely codegen | **NO CODEGEN** | Types are manually defined in `src/lib/db/schema/` |

### Base UI Render Prop (CRITICAL)

```tsx
// WRONG - Radix asChild pattern
<DialogTrigger asChild><Button>Open</Button></DialogTrigger>

// CORRECT - Base UI render prop
<DialogTrigger render={<Button />}>Open</DialogTrigger>
<AlertDialogAction render={<Button variant="destructive" />}>Delete</AlertDialogAction>
```

### React Compiler (CRITICAL)

```tsx
// WRONG
const handleClick = useCallback(() => { ... }, [deps]);
const computed = useMemo(() => expensive(), [deps]);

// CORRECT - Just write normal code
const handleClick = () => { ... };
const computed = expensive();
```

---

## Agent Workflow

### Before Any Task

1. **Read relevant docs** (see table below)
2. **Find existing examples** in codebase
3. **For sub-agents**: Pass doc paths in prompt

### When to Use Plan Mode

**USE**: New features, major refactoring, complex bugs
**SKIP**: Simple bug fixes, minor UI tweaks, small enhancements

---

## Essential Rules

### Security
- **NEVER** expose/log/commit secrets

### Code Quality
- Run `pnpm check` after finishing tasks
- **NO TESTING IF NOT MENTIONED**

### Data & Database
- All server data operations through RPC layer
- Use Repository pattern for DB operations
- **NO OPTIMISTIC UPDATES**
- After new migration, update [docs/db-schema.md](docs/db-schema.md)

### Background Tasks
- **ALWAYS** use job queue for long-running tasks (exports, emails, reports)
- Use `waitUntil` for lightweight tasks (analytics, webhooks)

---

## Quick Commands

```bash
pnpm dev              # Dev server (port 3000)
pnpm check            # Format + lint + type-check (RUN AFTER FINISHING)
pnpm kysely migrate latest   # Run migrations
pnpm ui add <name>    # Add shadcn/ui component
pnpm worker           # Start job worker
```

---

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

---

## Project Structure

```
src/
├── routes/           # File-based routing
│   ├── __root.tsx    # Shell pattern (SSR)
│   ├── (auth)/       # Auth pages (pathless group)
│   ├── (user)/       # Protected user routes
│   └── admin/        # Admin routes (/admin prefix)
├── rpc/              # Type-safe RPC
│   ├── handlers/     # Domain procedures
│   └── router.ts     # Main router
├── lib/db/           # Database layer
│   ├── repositories/ # Data access
│   └── schema/       # Type definitions (manual)
└── worker/           # Background jobs
```

---

## Implementation Order

1. **Read relevant docs** first
2. **Plan first, ask first** - Draft DB schema changes, get confirmation
3. **Order**: DB schema > RPC handlers > Page route > UI > `pnpm check`
4. Co-locate single-use components in page route file
5. Add nav links: `src/components/app/app-sidebar.tsx` or `admin-sidebar.tsx`

---

## Documentation Reference

| Topic | Doc | When to Read |
|-------|-----|--------------|
| **UI/Forms/Dialogs** | [docs/ui-guidelines.md](docs/ui-guidelines.md) | Any UI work |
| **RPC Layer** | [docs/rpc-architecture.md](docs/rpc-architecture.md) | Creating API endpoints |
| **Database** | [docs/database-repository.md](docs/database-repository.md) | DB queries, repositories |
| **DB Schema** | [docs/db-schema.md](docs/db-schema.md) | Current schema reference |
| **Routing** | [docs/tanstack-start.md](docs/tanstack-start.md) | Adding pages, route guards |
| **Feature Development** | [docs/development-guides.md](docs/development-guides.md) | Full CRUD implementation |
| **Job Queue** | [docs/job-queue-worker.md](docs/job-queue-worker.md) | Background tasks |
| **React Conventions** | [docs/react-conventions.md](docs/react-conventions.md) | Component patterns, naming |
| **File Storage** | [docs/file-storage.md](docs/file-storage.md) | S3, file uploads |
| **Utilities** | [docs/utilities.md](docs/utilities.md) | Date, lodash utils |
| **Commands** | [docs/commands.md](docs/commands.md) | CLI commands |
| **Architecture** | [docs/shell-spa-architecture.md](docs/shell-spa-architecture.md) | Project structure |
| **DevOps** | [docs/devops.md](docs/devops.md) | Deployment |
| **Cloudflare** | [docs/cloudflare.md](docs/cloudflare.md) | Cloudflare Workers |

---

## Environment Variables

```env
VITE_BASE_URL=http://localhost:3000
DATABASE_URL="postgresql://user:password@localhost:5432/postgres"
BETTER_AUTH_SECRET=<pnpm auth:secret>
```

Type-safe env in `src/env/client.ts` and `src/env/server.ts`.
