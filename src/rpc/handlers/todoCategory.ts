import { pickBy } from "lodash-es";
import { z } from "zod";
import { generateUUID } from "@/lib/data";
import { authedProcedure } from "../base";

export const listCategories = authedProcedure.handler(async ({ context }) => {
  const { repos } = context;
  return repos.todoCategory.find({ where: { userId: context.user.id } });
});

export const createCategory = authedProcedure
  .input(
    z.object({
      name: z.string().min(1),
    }),
  )
  .handler(async ({ input, context }) => {
    const { repos } = context;
    const newCategory = await repos.todoCategory.insertReturn({
      id: generateUUID(),
      userId: context.user.id,
      name: input.name,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return newCategory ?? null;
  });

export const updateCategory = authedProcedure
  .input(
    z.object({
      id: z.string(),
      name: z.string().min(1),
    }),
  )
  .handler(async ({ input, context, errors }) => {
    const { repos } = context;
    const { id, ...updates } = input;

    // Authorization: Verify the category belongs to the user
    const existingCategory = await repos.todoCategory.findById(id);
    if (!existingCategory || existingCategory.userId !== context.user.id) {
      throw errors.NOT_FOUND();
    }

    const updatedCategory = await repos.todoCategory.updateById({
      id,
      data: {
        ...pickBy(updates, (value) => value !== undefined),
        updatedAt: new Date(),
      },
    });
    return updatedCategory ?? null;
  });

export const deleteCategory = authedProcedure
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context, errors }) => {
    const { repos } = context;

    // Authorization: Verify the category belongs to the user
    const existingCategory = await repos.todoCategory.findById(input.id);
    if (!existingCategory || existingCategory.userId !== context.user.id) {
      throw errors.NOT_FOUND();
    }

    await repos.todoCategory.deleteById(input.id);
    return { success: true };
  });
