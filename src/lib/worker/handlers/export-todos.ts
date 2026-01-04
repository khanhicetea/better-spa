import type { JobHandler, JobPayloads } from "../types";

export const exportTodosHandler: JobHandler<"export_todos"> = async ({
  db,
  job,
  updateProgress,
}) => {
  const payload = job.payload as JobPayloads["export_todos"];

  await updateProgress(10);
  await new Promise((r) => setTimeout(r, 2000));

  // Fetch categories
  const categories = await db
    .selectFrom("todoCategory")
    .selectAll()
    .where("userId", "=", payload.userId)
    .execute();

  await updateProgress(30);
  await new Promise((r) => setTimeout(r, 2000));

  // Fetch todo items
  const todoItems = await db
    .selectFrom("todoItem")
    .selectAll()
    .where("userId", "=", payload.userId)
    .execute();

  await updateProgress(60);
  await new Promise((r) => setTimeout(r, 2000));

  // Build export data
  const exportData = {
    exportedAt: new Date().toISOString(),
    categories: categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      createdAt: cat.createdAt,
      items: todoItems
        .filter((item) => item.categoryId === cat.id)
        .map((item) => ({
          id: item.id,
          content: item.content,
          completedAt: item.completedAt,
          createdAt: item.createdAt,
        })),
    })),
    summary: {
      totalCategories: categories.length,
      totalItems: todoItems.length,
      completedItems: todoItems.filter((item) => item.completedAt).length,
    },
  };

  await updateProgress(90);
  await new Promise((r) => setTimeout(r, 2000));

  // Simulate some processing time for demo
  await new Promise((resolve) => setTimeout(resolve, 500));

  await updateProgress(100);

  return exportData;
};
