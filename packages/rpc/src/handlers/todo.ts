import { pickBy } from "lodash-es";
import { z } from "zod";
import { generateUUID } from "@better-spa/shared/helpers/data";
import { authedProcedure } from "../base";

export const list = authedProcedure.handler(async ({ context }) => {
  const { repos } = context;
  return repos.todoItem.find({
    where: { userId: context.user.id },
    modify: (qb) => qb.orderBy("createdAt", "desc"),
  });
});

export const create = authedProcedure
  .input(
    z.object({
      content: z.string().min(1),
    }),
  )
  .handler(async ({ input, context }) => {
    const { repos } = context;
    const newTodo = await repos.todoItem.insertReturn({
      id: generateUUID(),
      userId: context.user.id,
      content: input.content,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return newTodo ?? null;
  });

export const update = authedProcedure
  .input(
    z.object({
      id: z.string(),
      content: z.string().min(1).optional(),
      completedAt: z.date().nullable().optional(),
    }),
  )
  .handler(async ({ input, context, errors }) => {
    const { repos } = context;
    const { id, ...updates } = input;

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

export const remove = authedProcedure
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context, errors }) => {
    const { repos } = context;

    const existingTodo = await repos.todoItem.findById(input.id);
    if (!existingTodo || existingTodo.userId !== context.user.id) {
      throw errors.NOT_FOUND();
    }

    await repos.todoItem.deleteById(input.id);
    return { success: true };
  });

export const exportData = authedProcedure.handler(async ({ context }) => {
  const { repos } = context;
  const todos = await repos.todoItem.find({
    where: { userId: context.user.id },
    modify: (qb) => qb.orderBy("createdAt", "desc"),
  });
  return {
    total: todos.length,
    todos,
  };
});
