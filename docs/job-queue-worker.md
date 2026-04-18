# Job Queue Worker

**For Agents**: Read this doc when implementing or debugging background jobs.

---

## Critical Rule: Queue-Only Execution

Web requests must only enqueue jobs.

- RPC handlers create job records and return immediately.
- Request runtime must not execute job handlers directly.
- Only `pnpm worker` processes queued jobs.

This keeps request latency stable and avoids hidden background work in the web process.

---

## Current Baseline

The production baseline ships with one reference async flow:

- Feature: Todo export
- Job type: `export_todos`
- Enqueue RPC: `orpc.todo.export`
- Worker handler: `src/server/worker/handlers/export-todos.ts`

Route surface related to jobs:

- User UI: `/app/todo`
- Admin UI: `/admin/jobs`

---

## File Map

Core worker runtime:

- `src/server/worker/runner.ts` - worker process entry
- `src/server/worker/worker.ts` - polling + job execution
- `src/server/worker/rpc.ts` - job type registration
- `src/server/worker/base.ts` - `workerProcedure` context
- `src/server/worker/types.ts` - inferred payload/result types and type guards
- `src/server/worker/helpers.ts` - typed job factory helpers

Web enqueue and consumption:

- `src/rpc/handlers/todo.ts` - enqueue export jobs
- `src/rpc/handlers/job.ts` - job read/list/cancel APIs
- `src/lib/hooks/jobs.ts` - query/listen hooks for jobs
- `src/lib/jobs/status.ts` - shared status + polling helpers

Operations:

- `scripts/worker.ts` - command entry for `pnpm worker`

---

## End-to-End Flow

1. User clicks export in `/app/todo`.
2. Client calls `orpc.todo.export`.
3. RPC handler creates a `job` row with status `pending`.
4. Worker (`pnpm worker`) claims the job and moves it to `processing`.
5. Worker updates progress and writes final `result`.
6. Job ends in `completed`, `failed`, or `cancelled`.
7. UI polling/hook transitions update the page.

If worker is not running, jobs remain queued (`pending`).

---

## Enqueue Pattern (RPC)

Use RPC handlers to enqueue only.

```ts
// src/rpc/handlers/todo.ts
export const exportData = authedProcedure.handler(async ({ context }) => {
  const job = await context.repos.job.createJob({
    userId: context.user.id,
    type: "export_todos",
    payload: { userId: context.user.id },
  });

  return job ?? null;
});
```

Do not use in-request execution paths such as `waitUntil(worker.processJob(...))`.

---

## Processing Pattern (Worker)

Register handlers in `src/server/worker/rpc.ts`:

```ts
export const workerRpc = {
  export_todos: exportTodosJob,
} as const;
```

Implement each handler as `workerProcedure` with typed input/output:

```ts
// src/server/worker/handlers/export-todos.ts
const exportTodosProcedure = workerProcedure
  .input(z.object({ userId: z.string() }))
  .handler(async ({ input, context }) => {
    const items = await context.repos.todoItem.find({
      where: { userId: input.userId },
    });

    await context.updateProgress({ progress: 100 });

    return {
      exportedAt: new Date().toISOString(),
      summary: { totalItems: items.length },
      items,
    };
  });
```

Start worker runtime:

```bash
pnpm worker
```

---

## RPC Surface for Jobs

Current job RPC domain names:

- `orpc.job.listAdmin` - admin list across users
- `orpc.job.list` - current user list
- `orpc.job.get` - current user job detail
- `orpc.job.cancel` - cancel pending job (owner or admin)
- `orpc.job.create` - generic manual job creation endpoint

Todo export trigger:

- `orpc.todo.export`

---

## Client Polling and Listen Semantics

Shared helpers in `src/lib/jobs/status.ts` define:

- Active statuses: `pending`, `processing`
- Terminal statuses: `completed`, `failed`, `cancelled`
- Polling defaults:
  - active jobs: `1000ms`
  - idle lists: `5000ms`
  - terminal single job: stop polling

`useListenJob` behavior in `src/lib/hooks/jobs.ts`:

- `onChange` fires when status or progress changes.
- `onSuccess`, `onFailed`, `onCancel`, and `onSettled` fire once per terminal status transition.
- callbacks do not repeatedly fire on every render after terminal state.

Example:

```ts
const exportMutation = useMutation(
  orpc.todo.export.mutationOptions({
    onSuccess: (job) => setJobId(job.id),
  }),
);

useListenJob<"export_todos">({
  jobId,
  enabled: !!jobId,
  onSuccess: (job) => {
    toast.success(`Exported ${job.result?.summary.totalItems ?? 0} todos`);
    setJobId(null);
  },
  onFailed: (job) => {
    toast.error(job.error ?? "Export failed");
    setJobId(null);
  },
});
```

---

## Type Safety

`src/server/worker/types.ts` infers payload/result types from registered worker handlers:

- `JobType`
- `JobPayload<T>`
- `JobResult<T>`

Use typed hooks for job result access:

```ts
const { data: job } = useJob<"export_todos">(jobId);
```

Use type guards when needed:

- `isPendingJob`
- `isProcessingJob`
- `isCompletedJob`
- `isFailedJob`
- `isCancelledJob`
- `isTerminalJob`
- `isActiveJob`

---

## Adding a New Job Type

1. Create handler in `src/server/worker/handlers/<name>.ts`.
2. Register it in `src/server/worker/rpc.ts`.
3. Enqueue from an RPC handler (usually in `src/rpc/handlers/*`).
4. Expose UI through existing job hooks (`useUserJobs`, `useJob`, `useListenJob`).
5. Add admin visibility if needed through `/admin/jobs`.

Optional: use typed factories in `src/server/worker/helpers.ts`:

- `createJobFactory`
- `createScheduledJobFactory`
- `createPriorityJobFactory`

---

## Operational Checks

Manual acceptance checks:

1. Start app only, enqueue export from `/app/todo`.
2. Verify created job stays `pending` while no worker is running.
3. Start worker with `pnpm worker`.
4. Verify same job transitions to `processing` then `completed`.
5. Confirm `/admin/jobs` reflects status and progress transitions.

---

## Hardened Queue Model

The PostgreSQL-backed queue is hardened for multi-worker safety and reliability.

### Multi-Worker Safety (Leases)

- When a worker claims a job, it sets a **lease** (`lease_owner` and `lease_expires_at`).
- By default, the lease lasts **90 seconds**.
- While processing, the worker **heartbeats** every **30 seconds** to renew the lease.
- If a worker crashes, its lease will eventually expire. Other workers periodically run recovery to reschedule jobs with expired leases.

### Retry and Backoff

- Failed jobs are automatically rescheduled for retry if `retry_count < max_retries`.
- Retries use **exponential backoff**: `min(30s * 2^retry_count, 15m)`.
- If a handler throws a `NonRetryableJobError`, the job fails immediately without retrying.

### Graceful Shutdown

- On `SIGINT` or `SIGTERM`, the worker process stops claiming new jobs.
- It waits for all in-flight jobs to finish before closing the database connection and exiting.

### Multi-Worker Concurrency

- Workers use `SELECT FOR UPDATE SKIP LOCKED` to atomically claim jobs.
- Multiple worker instances can safely poll the same database without double-execution.
- Concurrency per worker instance is configurable via `WORKER_CONCURRENCY` (default: 1).

---
