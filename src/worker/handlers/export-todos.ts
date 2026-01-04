import { z } from "zod";
import type { DB } from "@/lib/db/init";
import type { Repositories } from "@/lib/db/repositories";
import type { Job } from "@/lib/db/schema/job";
import { workerProcedure } from "../base";

/**
 * Export todos job handler
 *
 * This handler exports all todos for a user, including categories and items.
 * Progress is updated at multiple stages: 10% → 30% → 60% → 90% → 100%
 */

// Define the handler context type
type HandlerContext = {
  db: DB;
  repos: Repositories;
  job: Job;
  updateProgress: (progress: number) => Promise<void>;
};

// Define the handler logic as a plain function for direct execution

// Create the oRPC procedure for type inference
const exportTodosProcedure = workerProcedure
  .input(z.object({ userId: z.string() }))
  .handler(
    async ({
      input,
      context,
    }: {
      input: { userId: string };
      context: HandlerContext;
    }) => {
      const { userId } = input;
      const { repos, updateProgress } = context;

      await updateProgress(10);
      await new Promise((r) => setTimeout(r, 2000));

      // Fetch categories
      const categories = await repos.todoCategory.find({
        where: { userId },
      });

      await updateProgress(30);
      await new Promise((r) => setTimeout(r, 2000));

      // Fetch todo items
      const todoItems = await repos.todoItem.find({
        where: { userId },
      });

      await updateProgress(60);
      await new Promise((r) => setTimeout(r, 2000));

      // Build export data
      const exportData = {
        exportedAt: new Date().toISOString(),
        categories: categories.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          createdAt: cat.createdAt,
          items: todoItems
            .filter((item: any) => item.categoryId === cat.id)
            .map((item: any) => ({
              id: item.id,
              content: item.content,
              completedAt: item.completedAt,
              createdAt: item.createdAt,
            })),
        })),
        summary: {
          totalCategories: categories.length,
          totalItems: todoItems.length,
          completedItems: todoItems.filter((item: any) => item.completedAt).length,
        },
      };

      await updateProgress(90);
      await new Promise((r) => setTimeout(r, 2000));

      // Simulate some processing time for demo
      await new Promise((resolve) => setTimeout(resolve, 500));

      await updateProgress(100);

      return exportData;
    },
  );

// Export both the procedure (for types) and the handler function (for execution)
export default exportTodosProcedure;
