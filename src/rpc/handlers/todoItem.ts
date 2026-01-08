import { pickBy } from "lodash-es";
import { z } from "zod";
import { generateUUID } from "@/lib/helpers/data";
import { authedProcedure } from "../base";

export const listTodos = authedProcedure.handler(async ({ context }) => {
  const { repos } = context;
  return repos.todoItem.findTodoItemsByUserId(context.user.id);
});

export const createTodo = authedProcedure
  .input(
    z.object({
      content: z.string().min(1),
      categoryId: z.string(),
    }),
  )
  .handler(async ({ input, context }) => {
    const { repos } = context;
    const newTodo = await repos.todoItem.insertReturn({
      id: generateUUID(),
      userId: context.user.id,
      categoryId: input.categoryId,
      content: input.content,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return newTodo ?? null;
  });

export const updateTodo = authedProcedure
  .input(
    z.object({
      id: z.string(),
      content: z.string().min(1).optional(),
      completedAt: z.date().nullable().optional(),
      categoryId: z.string().optional(),
    }),
  )
  .handler(async ({ input, context, errors }) => {
    const { repos } = context;
    const { id, ...updates } = input;

    // Authorization: Verify the todo belongs to the user
    const existingTodo = await repos.todoItem.findById(id);
    if (!existingTodo || existingTodo.userId !== context.user.id) {
      throw errors.NOT_FOUND();
    }

    const updatedTodo = await repos.todoItem.updateById({
      id,
      data: {
        ...pickBy(updates, (value) => value !== undefined),
        updatedAt: new Date(),
      },
    });
    return updatedTodo ?? null;
  });

export const deleteTodo = authedProcedure
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context, errors }) => {
    const { repos } = context;

    // Authorization: Verify the todo belongs to the user
    const existingTodo = await repos.todoItem.findById(input.id);
    if (!existingTodo || existingTodo.userId !== context.user.id) {
      throw errors.NOT_FOUND();
    }

    await repos.todoItem.deleteById(input.id);
    return { success: true };
  });

export const exportTodos = authedProcedure.handler(async ({ context }) => {
  const { repos, worker, waitUntil } = context;

  const job = await repos.job.createJob({
    userId: context.user.id,
    type: "export_todos",
    payload: { userId: context.user.id },
  });

  if (job) {
    waitUntil(worker.processJob(job));
  }

  return job ?? null;
});
