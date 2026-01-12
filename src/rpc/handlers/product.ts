import { pickBy } from "lodash-es";
import { z } from "zod";
import { generateUUID } from "@/lib/helpers/data";
import { PrivateS3FilesSchema } from "@/lib/schemas/s3";
import { addPresignedUrlsToFiles } from "@/server/service/s3";
import { authedProcedure } from "../base";

export const listProducts = authedProcedure
  .input(
    z.object({
      page: z.number().int().positive().default(1),
      pageSize: z.number().int().positive().default(10),
    }),
  )
  .handler(async ({ input, context }) => {
    const { repos } = context;
    const paginated = await repos.product.findPaginatedProductsByUserId(
      context.user.id,
      input.page,
      input.pageSize,
    );

    const items = await Promise.all(
      paginated.items.map(async (product) => ({
        ...product,
        images: await addPresignedUrlsToFiles(product.images),
      })),
    );

    return {
      ...paginated,
      items,
    };
  });

export const getProduct = authedProcedure
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context, errors }) => {
    const { repos } = context;
    const product = await repos.product.findById(input.id);

    if (!product || product.userId !== context.user.id) {
      throw errors.NOT_FOUND();
    }

    return {
      ...product,
      images: await addPresignedUrlsToFiles(product.images),
    };
  });

export const createProduct = authedProcedure
  .input(
    z.object({
      name: z.string().min(1),
      description: z.string().nullable().optional(),
      images: PrivateS3FilesSchema.nullable().optional(),
    }),
  )
  .handler(async ({ input, context }) => {
    const { repos } = context;
    const newProduct = await repos.product.insertReturn({
      id: generateUUID(),
      userId: context.user.id,
      name: input.name,
      description: input.description ?? null,
      images: input.images ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (!newProduct) return null;

    return {
      ...newProduct,
      images: await addPresignedUrlsToFiles(newProduct.images),
    };
  });

export const updateProduct = authedProcedure
  .input(
    z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      description: z.string().nullable().optional(),
      images: PrivateS3FilesSchema.nullable().optional(),
    }),
  )
  .handler(async ({ input, context, errors }) => {
    const { repos } = context;
    const { id, ...updates } = input;

    const existingProduct = await repos.product.findById(id);
    if (!existingProduct || existingProduct.userId !== context.user.id) {
      throw errors.NOT_FOUND();
    }

    const updatedProduct = await repos.product.updateById({
      id,
      data: {
        ...pickBy(updates, (value) => value !== undefined),
        updatedAt: new Date(),
      },
    });

    if (!updatedProduct) return null;

    return {
      ...updatedProduct,
      images: await addPresignedUrlsToFiles(updatedProduct.images),
    };
  });

export const deleteProduct = authedProcedure
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context, errors }) => {
    const { repos } = context;

    const existingProduct = await repos.product.findById(input.id);
    if (!existingProduct || existingProduct.userId !== context.user.id) {
      throw errors.NOT_FOUND();
    }

    await repos.product.deleteById(input.id);
    return { success: true };
  });
