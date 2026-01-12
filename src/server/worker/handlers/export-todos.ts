import { z } from "zod";
import { workerProcedure } from "../base";

/**
 * Export todos job handler
 *
 * This handler exports all todos for a user.
 * Progress is updated at multiple stages: 10% → 30% → 60% → 90% → 100%
 */

// Create the oRPC procedure for type inference
const exportTodosProcedure = workerProcedure
  .meta({})
  .input(z.object({ userId: z.string() }))
  .handler(async ({ input, context }) => {
    const { userId } = input;
    const { repos, updateProgress } = context;

    await updateProgress({ progress: 10 });
    await new Promise((r) => setTimeout(r, 1000));

    // Fetch todo items
    const todoItems = await repos.todoItem.find({
      where: { userId },
    });

    await updateProgress({ progress: 60 });
    await new Promise((r) => setTimeout(r, 1000));

    // Build export data
    const exportData = {
      exportedAt: new Date().toISOString(),
      items: todoItems.map((item) => ({
        id: item.id,
        content: item.content,
        completedAt: item.completedAt,
        createdAt: item.createdAt,
      })),
      summary: {
        totalItems: todoItems.length,
        completedItems: todoItems.filter((item) => item.completedAt).length,
      },
    };

    await updateProgress({ progress: 90 });
    await new Promise((r) => setTimeout(r, 1000));

    return exportData;
  });

// Export both the procedure (for types) and the handler function (for execution)
export default exportTodosProcedure;
