// Import all job handlers
import exportTodosJob from "./handlers/export-todos";

/**
 * Worker RPC router
 *
 * Maps job type names to their handler procedures.
 * This is the single source of truth for all job types.
 */
export const workerRpc = {
  export_todos: exportTodosJob,
} as const;

/**
 * All available job types (inferred from handlers)
 */
export type JobType = keyof typeof workerRpc;
