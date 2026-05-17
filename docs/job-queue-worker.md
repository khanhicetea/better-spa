# Job Queue and Background Work

Rules for async work in this repo.

## Current Repo Truth

- The DB includes a `job` table and schema types.
- No dedicated worker runtime is checked in.
- `todo.export` is still synchronous RPC.

## Use a Queue When

- work is long-running
- users need progress or retry state
- the job may outlive the request
- the operation should be retried or scheduled

Use `context.waitUntil` only for lightweight best-effort work such as analytics or cleanup.

## Minimal Queue Contract

1. RPC validates input and inserts a `job` row.
2. A separate runtime claims pending jobs.
3. The worker updates `status`, `progress`, `result`, and `error`.
4. The UI polls or subscribes to the job record.

## Job Table Notes

The `job` table already supports:

- status
- progress
- payload
- result
- error
- retries
- priority
- lease fields for multi-worker safety

If you add a worker runtime, update this file and `AGENTS.md` with the exact commands and paths.
