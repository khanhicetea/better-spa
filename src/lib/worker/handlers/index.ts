import type { JobHandlerRegistry } from "../types";
import { exportTodosHandler } from "./export-todos";

/**
 * Registry of all job handlers.
 * Add new handlers here when creating new job types.
 */
export const jobHandlers: JobHandlerRegistry = {
  export_todos: exportTodosHandler,
};

export { exportTodosHandler } from "./export-todos";
