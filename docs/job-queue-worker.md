# Job Queue and Background Work

Compact reference for async work.

## Current Repo Truth

- The database includes a `job` table and related schema types.
- A dedicated worker runtime is **not** checked into the current tree.
- `todo.export` is currently synchronous RPC, not queued work.

## Rule If You Add Async Jobs

- Web requests should enqueue work and return immediately.
- Request handlers should not run long-lived worker logic inline.
- Use `context.waitUntil` only for lightweight best-effort work such as analytics or cleanup.

## When a Queue Is Appropriate

Use queued work for:

- exports
- report generation
- email batches
- retries or scheduled work
- progress-tracked user operations

Do not use `waitUntil` for those.

## Minimal Queue Design

If you add a worker system later, keep this contract:

1. RPC handler validates input and inserts a `job` row.
2. A separate runtime claims pending jobs.
3. The worker updates `status`, `progress`, `result`, and `error`.
4. The UI polls or subscribes to the job record.

## Job Schema Notes

The `job` table already supports:

- `status`
- `progress`
- `payload`
- `result`
- `error`
- retries and priority
- leasing fields for multi-worker safety

If you implement the missing worker runtime, update this doc and `AGENTS.md` to reflect the actual commands and file paths.
