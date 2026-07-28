import { z } from "zod";
import { generateUUID } from "@better-spa/shared/helpers/data";
import { authedProcedure } from "../base";
import { todoSchema, toTodo } from "../dto";

export const list = authedProcedure.output(z.array(todoSchema)).handler(async ({ context }) => {
  const { repos } = context;
  const todos = await repos.todoItem.listOwned(context.user.id);
  return todos.map(toTodo);
});

export const create = authedProcedure
  .input(
    z.object({
      content: z.string().min(1),
    }),
  )
  .output(todoSchema)
  .handler(async ({ input, context }) => {
    const { repos } = context;
    const newTodo = await repos.todoItem.create({
      id: generateUUID(),
      userId: context.user.id,
      content: input.content,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    if (!newTodo) {
      throw new Error("Todo insert did not return a row");
    }
    return toTodo(newTodo);
  });

export const update = authedProcedure
  .input(
    z.object({
      id: z.string(),
      content: z.string().min(1).optional(),
      completedAt: z.iso.datetime().nullable().optional(),
    }),
  )
  .output(todoSchema)
  .handler(async ({ input, context, errors }) => {
    const { repos } = context;
    const { id, ...updates } = input;

    const data: {
      content?: string;
      completedAt?: Date | null;
      updatedAt: Date;
    } = { updatedAt: new Date() };
    if (updates.content !== undefined) data.content = updates.content;
    if (updates.completedAt !== undefined) {
      data.completedAt = updates.completedAt ? new Date(updates.completedAt) : null;
    }

    const updatedTodo = await repos.todoItem.updateOwned(context.user.id, id, data);
    if (!updatedTodo) throw errors.NOT_FOUND();
    return toTodo(updatedTodo);
  });

export const remove = authedProcedure
  .input(z.object({ id: z.string() }))
  .output(z.object({ success: z.literal(true) }))
  .handler(async ({ input, context, errors }) => {
    const { repos } = context;

    const removed = await repos.todoItem.deleteOwned(context.user.id, input.id);
    if (!removed) throw errors.NOT_FOUND();
    return { success: true };
  });
