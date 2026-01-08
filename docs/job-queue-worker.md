# Job Queue Worker System

**For Agents**: Read this doc when implementing background tasks, exports, emails, or reports.

**CRITICAL**: ALWAYS use job queue for long-running tasks. NEVER run them directly in RPC handlers.

This document describes the type-safe, oRPC-based job queue system for background task processing.

---

## Overview

This is a **PostgreSQL-backed, polling-based job queue** that leverages oRPC's type inference to provide end-to-end type safety without manual type definitions.

**For quick background tasks, see the alternative:** [waitUntil in RPC Architecture](rpc-architecture.md#background-tasks-with-waituntil)

### Key Features

- ✅ **Type-Safe**: Full type inference from job definition to execution
- ✅ **Typed React Hooks**: Generic type parameters for typed payload/result access
- ✅ **Priority Queue**: Higher priority jobs are processed first
- ✅ **Scheduled Jobs**: Delayed execution with `runAt` timestamps
- ✅ **Concurrent-Safe**: Atomic job claiming with `SELECT FOR UPDATE SKIP LOCKED`
- ✅ **Retry Logic**: Automatic retry with configurable max attempts
- ✅ **Progress Tracking**: Real-time progress updates (0-100%)
- ✅ **Stale Detection**: Automatic timeout and cleanup
- ✅ **Type Guards**: Runtime type checking with TypeScript narrowing

### Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   RPC       │ enqueue │  PostgreSQL  │  poll   │   Worker    │
│  Handler    ├────────>│   Job Table  │<────────┤   Process   │
│             │         │              │         │             │
└─────────────┘         └──────────────┘         └─────────────┘
                                │
                                │ results
                                ▼
                        ┌──────────────┐
                        │  React Hook  │
                        │  (polling)   │
                        └──────────────┘
```

---

## When to Use Job Queue vs waitUntil

**Use Job Queue when:**
- ✅ Task takes more than 5 seconds
- ✅ Task must complete reliably (cannot be lost)
- ✅ Task needs to be scheduled for later
- ✅ Task needs progress tracking
- ✅ Task should be retried on failure
- ✅ Task is user-facing (exports, reports, emails)

**Use waitUntil instead when:**
- ✅ Task is very quick (< 1 second)
- ✅ Task is optional (analytics, webhooks)
- ✅ Task doesn't need persistence
- ✅ Task doesn't need retries or scheduling
- ✅ Examples: logging, cache updates, webhooks

### Quick Comparison

```typescript
// Use waitUntil - lightweight, no persistence
export const createPost = authedProcedure.handler(async ({ context }) => {
  const post = await context.repos.post.create(...);

  // Track analytics - can be lost, fast operation
  context.waitUntil(
    fetch("https://analytics.example.com/track", { method: "POST" })
  );

  return post;
});

// Use Job Queue - long-running, needs persistence
export const exportPosts = authedProcedure.handler(async ({ context }) => {
  // Create a persistent job that will retry on failure
  const job = await repos.job.createJob({
    type: "export_posts",
    payload: { userId: context.user.id },
    priority: JobPriority.HIGH,
  });

  return job;
});
```

---

## Core Concepts

### Job Definition = oRPC Procedure

Jobs are **oRPC procedures** with input validation and typed outputs:

```typescript
// src/worker/handlers/export-todos.ts
import { workerProcedure } from "../base";
import { z } from "zod";

const exportTodosProcedure = workerProcedure
  .input(z.object({ userId: z.string() }))  // Input schema
  .handler(async ({ input, context }) => {
    const { userId } = input;
    const { db, repos, job, updateProgress } = context;

    await updateProgress(10);
    // ... processing logic ...
    await updateProgress(100);

    return {  // Return type is inferred
      exportedAt: new Date().toISOString(),
      summary: { totalItems: 42 },
    };
  });

export default exportTodosProcedure;
```

### Worker Context

Every job handler receives a rich context:

```typescript
{
  db: DB;                    // Kysely database instance
  repos: Repositories;       // Repository pattern for data access
  job: Job;                  // Current job record (id, type, payload, etc.)
  updateProgress: (n: number) => Promise<void>;  // Update progress 0-100
}
```

### Job Registration

Jobs are registered in a centralized router:

```typescript
// src/worker/rpc.ts
import exportTodosJob from "./handlers/export-todos";

export const workerRpc = {
  export_todos: exportTodosJob,  // Key becomes job type
} as const;

export type JobType = keyof typeof workerRpc;  // "export_todos"
```

**IMPORTANT**: The `as const` assertion enables literal type inference.

---

## Type Inference System

All types flow from handler definitions via oRPC's type inference:

```typescript
// src/worker/types.ts
import type { InferRouterInputs, InferRouterOutputs } from "@orpc/server";
import type { workerRpc } from "./rpc";

export type JobType = keyof typeof workerRpc;
export type WorkerRouterInputs = InferRouterInputs<typeof workerRpc>;
export type WorkerRouterOutputs = InferRouterOutputs<typeof workerRpc>;

// Generic payload type for job type T
export type JobPayload<T extends JobType> = WorkerRouterInputs[T];

// Generic result type for job type T
export type JobResult<T extends JobType> = WorkerRouterOutputs[T];
```

### Type Inference in Action

```typescript
// No manual types needed!
type ExportPayload = JobPayload<"export_todos">;
// => { userId: string }

type ExportResult = JobResult<"export_todos">;
// => { exportedAt: string; summary: { totalItems: number } }
```

---

## Creating Jobs

### Method 1: Direct Repository API

```typescript
// In RPC handler
export const exportTodos = authedProcedure.handler(async ({ context }) => {
  const { repos, user } = context;

  const job = await repos.job.createJob({
    userId: user.id,
    type: "export_todos",              // Literal type
    payload: { userId: user.id },      // ✅ Type-checked against handler input!

    // Optional parameters
    label: "Export Todos to JSON",     // User-facing label
    maxRetries: 5,                     // Default: 3
    priority: JobPriority.HIGH,        // Default: NORMAL (5)
    runAt: new Date("2025-01-10"),     // Default: now()
  });

  return job;
});
```

### Method 2: Job Factory (Recommended)

Reduces boilerplate with full type inference:

```typescript
// Create factory once
import { createJobFactory, JobPriority } from "@/worker";

const createExportJob = createJobFactory("export_todos", "Export Todos");

// Use in multiple handlers
export const exportTodos = authedProcedure.handler(async ({ context }) => {
  return createExportJob(
    context.repos,
    context.user.id,
    { userId: context.user.id },  // ✅ Fully typed!
    { priority: JobPriority.URGENT }  // Optional
  );
});
```

### Method 3: Scheduled Job Factory

For jobs that always require a future execution time:

```typescript
import { createScheduledJobFactory } from "@/worker";

const scheduleExport = createScheduledJobFactory("export_todos");

const job = await scheduleExport(
  repos,
  userId,
  { userId },
  new Date(Date.now() + 5 * 60 * 1000),  // Required: run in 5 minutes
  { maxRetries: 5 }  // Optional
);
```

### Method 4: Priority Job Factory

For jobs that always require a priority level:

```typescript
import { createPriorityJobFactory, JobPriority } from "@/worker";

const createUrgentExport = createPriorityJobFactory("export_todos");

const job = await createUrgentExport(
  repos,
  userId,
  { userId },
  JobPriority.URGENT,  // Required
  { runAt: futureDate }  // Optional
);
```

---

## Job Priority System

### Priority Levels

```typescript
export enum JobPriority {
  LOW = 0,
  NORMAL = 5,    // Default
  HIGH = 10,
  URGENT = 20,
}
```

### Processing Order

Jobs are claimed in this order:
1. **Priority** (DESC) - URGENT → HIGH → NORMAL → LOW
2. **Created time** (ASC) - Older jobs first within same priority

### Example

```typescript
// Created at 10:00 AM, priority NORMAL
await repos.job.createJob({ type: "export_todos", payload: {...}, priority: 5 });

// Created at 10:01 AM, priority HIGH
await repos.job.createJob({ type: "export_todos", payload: {...}, priority: 10 });

// Created at 10:02 AM, priority URGENT
await repos.job.createJob({ type: "export_todos", payload: {...}, priority: 20 });

// Processing order: URGENT (10:02) → HIGH (10:01) → NORMAL (10:00)
```

---

## Scheduled Jobs

### How It Works

Jobs with `runAt > now()` are **not claimed** until their scheduled time arrives.

### Use Cases

1. **Delayed Processing**: Export report at end of day
2. **Recurring Tasks**: Daily summary emails
3. **Rate Limiting**: Spread jobs over time
4. **User-Scheduled Actions**: "Send reminder in 1 hour"

### Example

```typescript
// Schedule job to run tomorrow at 9 AM
const tomorrow9AM = new Date();
tomorrow9AM.setDate(tomorrow9AM.getDate() + 1);
tomorrow9AM.setHours(9, 0, 0, 0);

await repos.job.createJob({
  type: "send_report",
  payload: { userId },
  runAt: tomorrow9AM,
  priority: JobPriority.HIGH,
});
```

---

## Type-Safe Result Access

### Problem

```typescript
const job = await repos.job.findById(jobId);
job.result;  // Type: unknown | null 😞
```

### Solution: Type-Safe Accessors

```typescript
// Method 1: With undefined handling
const job = await repos.job.getJobWithResult<"export_todos">(jobId);
if (job?.result) {
  job.result.summary.totalItems;  // ✅ Fully typed!
}

// Method 2: Throws if not found
const job = await repos.job.getJobWithResultOrFail<"export_todos">(jobId);
if (job.result) {
  job.result.exportedAt;  // ✅ Fully typed!
}
```

---

## Job Status Type Guards

### Available Guards

```typescript
import {
  isPendingJob,
  isProcessingJob,
  isCompletedJob,
  isFailedJob,
  isCancelledJob,
  isTerminalJob,
  isActiveJob,
} from "@/worker";

const job = await repos.job.findById(jobId);

if (isCompletedJob(job)) {
  job.status;  // Type: "completed" (literal type!)
  job.result;  // Safe to access
  job.completedAt;  // Date | null
}

if (isTerminalJob(job)) {
  job.status;  // Type: "completed" | "failed" | "cancelled"
  // Job is in final state, won't change
}

if (isActiveJob(job)) {
  job.status;  // Type: "pending" | "processing"
  // Job is still being worked on
}
```

### Type Narrowing

Type guards provide **TypeScript type narrowing**:

```typescript
function processJob(job: Job) {
  if (isCompletedJob(job)) {
    // TypeScript knows job.status === "completed" here
    return job.result;
  }

  if (isFailedJob(job)) {
    // TypeScript knows job.status === "failed" here
    throw new Error(job.error ?? "Unknown error");
  }
}
```

---

## Worker Setup

### Database Migration

Run migration to add job table with priority and scheduling:

```bash
pnpm db:migrate latest
```

This applies:
- `004_job.ts` - Base job table
- `005_job_priority_schedule.ts` - Priority and scheduling columns

### Worker Process

```typescript
// scripts/worker.ts
import { Worker } from "@/worker";
import { env } from "@/env/server";

const worker = new Worker(env.DATABASE_URL, {
  pollIntervalMs: 2000,           // Poll every 2 seconds
  staleCheckIntervalMs: 60000,    // Check for stale jobs every minute
  staleThresholdMinutes: 5,       // Jobs stuck > 5 min are marked failed
});

worker.start();

// Graceful shutdown
process.on("SIGINT", async () => {
  await worker.shutdown();
  process.exit(0);
});
```

### Running the Worker

**Development:**
```bash
pnpm worker      # or pnpm worker:dev (tsx --env-file=.env scripts/worker.ts)
```

**Production:**
```bash
# 1. Build the worker
pnpm worker:build  # Compiles to .output/worker/worker.js

# 2. Run the compiled worker
pnpm worker:start  # or: node .output/worker/worker.js
```

### Production Build Setup

The worker uses **tsup** (`tsup.config.ts`) to compile TypeScript into a production-ready JavaScript bundle:

**Build Output:**
- Entry: `scripts/worker.ts`
- Output: `.output/worker/worker.js`

**Environment Variables:**
- Development: Loaded from `.env` file via `--env-file` flag
- Production: Set at system level (DATABASE_URL, NODE_ENV, etc.)

**Running Server and Worker Together:**
```bash
# Terminal 1 - TanStack Start Server
node .output/server/index.mjs

# Terminal 2 - Job Worker
node .output/worker/worker.js
```

### Multiple Workers

The system supports **concurrent workers** safely:

```bash
# Terminal 1
pnpm worker

# Terminal 2
pnpm worker

# Terminal 3
pnpm worker
```

Jobs are claimed atomically using `SELECT FOR UPDATE SKIP LOCKED`.

---

## Client Integration (React)

### Hooks Available

```typescript
import { useUserJobs, useJob, useListenJob } from "@/lib/hooks/jobs";
```

### 1. List Jobs Hook

```typescript
const { data: jobs, isLoading } = useUserJobs({
  status: "processing",  // Optional filter
  limit: 10,             // Optional limit
  enabled: true,         // Optional toggle
});

// Smart polling:
// - 1 second when jobs are active (pending/processing)
// - 5 seconds when all jobs are terminal
// - Stops when enabled=false
```

### 2. Single Job Hook (Type-Safe!)

```typescript
// Without type parameter (generic Job type)
const { data: job } = useJob(jobId, true);
job?.result;  // Type: unknown | null

// With type parameter (fully typed!) ✨
const { data: job } = useJob<"export_todos">(jobId, true);
if (job?.result) {
  job.result.summary.totalItems;  // ✅ Fully typed!
  job.result.exportedAt;          // ✅ Autocomplete works!
}
if (job?.payload) {
  job.payload.userId;  // ✅ Typed as string!
}

// Polls every 1 second while job is active
// Stops polling when job reaches terminal state
```

### 3. Job Listener Hook (Event-Driven & Type-Safe!)

```typescript
// Without type parameter
useListenJob({
  jobId: exportingJobId,
  enabled: !!exportingJobId,
  onChange: (job) => setProgress(job.progress),
  onSuccess: (job) => {
    job.result;  // Type: unknown | null
  },
});

// With type parameter (fully typed!) ✨
useListenJob<"export_todos">({
  jobId: exportingJobId,
  enabled: !!exportingJobId,

  onChange: (job) => {
    if (job.status === "processing") {
      setProgress(job.progress);
    }
  },

  onSuccess: (job) => {
    // job.result is fully typed!
    if (job.result) {
      console.log(`Exported ${job.result.summary.totalItems} items`);
      downloadFile(job.result.exportedAt);
    }
    toast.success("Export completed");
  },

  onFailed: (job) => {
    toast.error(`Export failed: ${job.error}`);
  },

  onSettled: (job) => {
    setExportingJobId(null);
  },
});
```

### Complete UI Example (With Type Safety!)

```typescript
function ExportButton() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const exportMutation = useMutation(
    orpc.todoItem.exportTodos.mutationOptions({
      onSuccess: (job) => {
        setJobId(job.id);
        toast.success("Export started");
      },
    })
  );

  // ✨ Type parameter provides full type safety
  useListenJob<"export_todos">({
    jobId: jobId!,
    enabled: !!jobId,
    onChange: (job) => setProgress(job.progress),
    onSuccess: (job) => {
      // job.result is fully typed!
      if (job.result) {
        console.log(`Exported ${job.result.summary.totalItems} items`);
      }
      toast.success("Export completed");
      setJobId(null);
    },
    onFailed: (job) => {
      toast.error(job.error || "Export failed");
      setJobId(null);
    },
  });

  return (
    <>
      <Button
        onClick={() => exportMutation.mutate()}
        disabled={!!jobId}
      >
        {jobId ? `Exporting... ${progress}%` : "Export"}
      </Button>
    </>
  );
}
```

---

## Adding New Job Types

### Step-by-Step Guide

#### 1. Create Handler

```typescript
// src/worker/handlers/send-email.ts
import { workerProcedure } from "../base";
import { z } from "zod";

const sendEmailProcedure = workerProcedure
  .input(z.object({
    to: z.string().email(),
    subject: z.string(),
    body: z.string(),
  }))
  .handler(async ({ input, context }) => {
    const { to, subject, body } = input;
    const { updateProgress } = context;

    await updateProgress(10);

    // Send email logic here
    const messageId = await sendEmail(to, subject, body);

    await updateProgress(100);

    return {
      messageId,
      sentAt: new Date().toISOString(),
    };
  });

export default sendEmailProcedure;
```

#### 2. Register in Router

```typescript
// src/worker/rpc.ts
import exportTodosJob from "./handlers/export-todos";
import sendEmailJob from "./handlers/send-email";  // Add import

export const workerRpc = {
  export_todos: exportTodosJob,
  send_email: sendEmailJob,  // Add to router
} as const;
```

#### 3. Add Default Label

```typescript
// src/lib/db/repositories/job.repo.ts
const DEFAULT_JOB_LABELS: Record<JobType, string> = {
  export_todos: "Export Todos to JSON",
  send_email: "Send Email",  // Add label
};
```

#### 4. Create RPC Handler

```typescript
// src/rpc/handlers/email.ts
import { authedProcedure } from "../base";
import { createJobFactory, JobPriority } from "@/worker";

const createEmailJob = createJobFactory("send_email", "Send Email");

export const sendWelcomeEmail = authedProcedure
  .handler(async ({ context }) => {
    return createEmailJob(
      context.repos,
      context.user.id,
      {
        to: context.user.email,
        subject: "Welcome!",
        body: "Thanks for joining...",
      },
      { priority: JobPriority.HIGH }
    );
  });
```

#### 5. Use in UI

```typescript
import { orpc } from "@/lib/orpc";
import { useMutation } from "@tanstack/react-query";

const sendMutation = useMutation(
  orpc.email.sendWelcomeEmail.mutationOptions({
    onSuccess: (job) => {
      toast.success("Email queued");
    },
  })
);
```

**That's it!** Types are automatically inferred everywhere.

---

## Best Practices

### DO ✅

1. **Use Job Factories** for repeated job creation patterns
2. **Set appropriate priorities** for time-sensitive jobs
3. **Update progress** at logical stages (0 → 25 → 50 → 75 → 100)
4. **Use type guards** instead of manual status checks
5. **Use repositories** for all database access (no raw SQL)
6. **Handle errors gracefully** - they're automatically retried
7. **Use scheduled jobs** for delayed execution
8. **Set maxRetries** based on job criticality

### DON'T ❌

1. **Don't create jobs in loops** - use bulk operations or batch jobs
2. **Don't skip progress updates** - users want feedback
3. **Don't access DB directly** - use context.repos
4. **Don't forget error handling** - unexpected errors will retry
5. **Don't use optimistic updates** - follow pessimistic pattern
6. **Don't hardcode job types** - use JobType type
7. **Don't manually cast results** - use getJobWithResult<T>()
8. **Don't poll aggressively** - use hooks' smart polling

---

## Progress Tracking Patterns

### Simple Progress

```typescript
await updateProgress(0);
// ... step 1 ...
await updateProgress(50);
// ... step 2 ...
await updateProgress(100);
```

### Multi-Stage Progress

```typescript
const stages = [
  { name: "Fetching data", weight: 30 },
  { name: "Processing", weight: 50 },
  { name: "Saving results", weight: 20 },
];

let progress = 0;
for (const stage of stages) {
  console.log(`Starting: ${stage.name}`);
  // ... work ...
  progress += stage.weight;
  await updateProgress(progress);
}
```

### Detailed Progress with Items

```typescript
const items = await repos.todoItem.findAll();
const total = items.length;

for (let i = 0; i < total; i++) {
  await processItem(items[i]);

  const progress = Math.floor(((i + 1) / total) * 100);
  await updateProgress(progress);
}
```

---

## Database Schema

### Job Table

```sql
CREATE TABLE job (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER NOT NULL DEFAULT 0,
  payload JSONB,
  result JSONB,
  error TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  priority INTEGER NOT NULL DEFAULT 5,
  run_at TIMESTAMP NOT NULL DEFAULT now(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_job_status_priority_created ON job(status, priority, created_at);
CREATE INDEX idx_job_run_at ON job(run_at, status);
CREATE INDEX idx_job_user_id ON job(user_id);
```

### Job Status Flow

```
pending → processing → completed
                    ↘ failed → pending (retry)
                            ↘ failed (max retries)

pending → cancelled (user action)
```

---

## Troubleshooting

### Job Not Being Processed

**Check:**
1. Is worker running? (`pnpm worker`)
2. Is `runAt` in the future? (scheduled job)
3. Is job status "pending"? (may be stuck in "processing")
4. Database connection working?

**Debug:**
```typescript
const job = await repos.job.findById(jobId);
console.log({
  status: job.status,
  runAt: job.runAt,
  priority: job.priority,
  error: job.error,
});
```

### Job Keeps Failing

**Check:**
1. Error message in `job.error` field
2. Retry count vs max retries
3. Handler implementation for bugs
4. Database constraints

**Debug:**
```typescript
const job = await repos.job.findById(jobId);
if (isFailedJob(job)) {
  console.error(`Failed: ${job.error}`);
  console.log(`Retry count: ${job.retryCount}/${job.maxRetries}`);
}
```

### Stale Jobs (Stuck in "processing")

**Cause:** Worker crashed or job exceeded 5-minute threshold

**Solution:** Worker automatically marks stale jobs as failed every minute

**Manual fix:**
```typescript
await repos.job.markStaleJobsAsFailed(5);  // 5 minutes threshold
```

---

## Performance Considerations

### Worker Polling

- Default: 2 seconds
- Increase for lower DB load: `pollIntervalMs: 5000`
- Decrease for faster response: `pollIntervalMs: 1000`

### Concurrent Workers

- Each worker claims 1 job at a time
- More workers = more concurrent jobs
- Recommended: 1 worker per CPU core

### Database Load

- Smart indexes optimize job claiming
- JSONB for flexible payload/result storage
- CASCADE deletes clean up user jobs automatically

### Client Polling

- React hooks use adaptive polling
- Active jobs: 1 second
- Terminal jobs: 5 seconds or stop
- Minimize unnecessary re-fetches

---

## Migration Guide (Old → New)

If upgrading from the base system, here are the key changes:

### What Changed

1. ✅ Added `priority` column and `JobPriority` enum
2. ✅ Added `runAt` column for scheduling
3. ✅ Updated indexes for priority-based polling
4. ✅ Added type-safe result accessors to JobRepository
5. ✅ Added job status type guards
6. ✅ Created job factory helper functions

### Migration Steps

1. **Run migration:** `pnpm db:migrate latest`
2. **Update job creation** (optional, backward compatible):
   ```typescript
   // Old (still works)
   await repos.job.createJob({ type, payload, userId });

   // New (recommended)
   const createJob = createJobFactory(type);
   await createJob(repos, userId, payload, { priority: JobPriority.HIGH });
   ```

3. **Use type-safe result access** (optional):
   ```typescript
   // Old
   const job = await repos.job.findById(id);
   const result = job.result as JobResult<"export_todos">;

   // New
   const job = await repos.job.getJobWithResult<"export_todos">(id);
   const result = job?.result;  // Fully typed!
   ```

4. **Use type guards** (optional):
   ```typescript
   // Old
   if (job.status === "completed") { ... }

   // New
   if (isCompletedJob(job)) { ... }  // Type narrowing!
   ```

### Backward Compatibility

All changes are **backward compatible**:
- Existing jobs work without modification
- Old job creation syntax still works
- Priority defaults to NORMAL (5)
- runAt defaults to now()

---

## Quick Reference

### Imports

```typescript
// Job creation
import { createJobFactory, JobPriority } from "@/worker";

// Type guards
import { isCompletedJob, isTerminalJob, isActiveJob } from "@/worker";

// Types
import type { JobType, JobPayload, JobResult } from "@/worker";

// Repository
import { JobPriority } from "@/lib/db/schema";

// Hooks (with types!)
import { useUserJobs, useJob, useListenJob, type TypedJob } from "@/lib/hooks/jobs";
```

### Common Operations

```typescript
// Create job
await repos.job.createJob({ type, payload, userId, priority, runAt });

// Create with factory
const create = createJobFactory("export_todos");
await create(repos, userId, payload, { priority: JobPriority.HIGH });

// Get job with typed result (server-side)
const job = await repos.job.getJobWithResult<"export_todos">(id);

// Use typed hooks (client-side)
const { data: job } = useJob<"export_todos">(jobId);
useListenJob<"export_todos">({ jobId, onSuccess: (job) => { ... } });

// Type guard
if (isCompletedJob(job)) { ... }

// Cancel job
await repos.job.updateById(id, { status: "cancelled" });
```

---

## File Locations

```
src/worker/
├── index.ts              # Worker class, main export
├── base.ts               # workerProcedure definition
├── rpc.ts                # Job router registration
├── types.ts              # Type inference, type guards
├── helpers.ts            # Job factory functions
└── handlers/
    └── export-todos.ts   # Example job handler

src/lib/db/
├── migrations/
│   ├── 004_job.ts                    # Base job table
│   └── 005_job_priority_schedule.ts  # Priority + scheduling
├── schema/
│   └── job.ts                        # JobTable, JobPriority enum
└── repositories/
    └── job.repo.ts                   # JobRepository

src/lib/hooks/
└── jobs.ts               # React hooks

src/rpc/handlers/
└── job.ts                # Job RPC handlers

scripts/
└── worker.ts             # Worker startup script

# Build Configuration
tsup.config.ts            # Worker build configuration (tsup)

# Build Output (generated, gitignored)
.output/worker/
└── worker.js             # Compiled worker bundle
```

---

## Summary

This job queue system provides:

1. **Zero boilerplate** - Types inferred from handlers
2. **Production-ready** - Atomic operations, retries, stale detection
3. **Developer-friendly** - Factory functions, type guards, smart hooks
4. **Scalable** - Concurrent workers, priority queue, scheduling
5. **Type-safe** - End-to-end type safety with no manual definitions

For LLM agents: When implementing background tasks, always use this job system instead of direct execution in RPC handlers.
