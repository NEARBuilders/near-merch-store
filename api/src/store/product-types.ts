import { eq } from 'drizzle-orm';
import { Context, Effect, Layer } from 'every-plugin/effect';
import * as schema from '../db/schema';
import type { ProductType } from '../schema';
import { Database } from './database';

export class ProductTypeStore extends Context.Tag('ProductTypeStore')<
  ProductTypeStore,
  {
    readonly findAll: () => Effect.Effect<ProductType[], Error>;
    readonly findBySlug: (slug: string) => Effect.Effect<ProductType | null, Error>;
    readonly create: (productType: { slug: string; label: string; description?: string; displayOrder?: number }) => Effect.Effect<ProductType, Error>;
    readonly update: (slug: string, data: { label?: string; description?: string; displayOrder?: number }) => Effect.Effect<ProductType | null, Error>;
    readonly delete: (slug: string) => Effect.Effect<boolean, Error>;
  }
>() { }

export const ProductTypeStoreLive = Layer.effect(
  ProductTypeStore,
  Effect.gen(function* () {
    const db = yield* Database;

    const rowToProductType = (row: typeof schema.productTypes.$inferSelect): ProductType => ({
      slug: row.slug,
      label: row.label,
      description: row.description || undefined,
      displayOrder: row.displayOrder,
    });

    return {
      findAll: () =>
        Effect.tryPromise({
          try: async () => {
            const results = await db
              .select()
              .from(schema.productTypes)
              .orderBy(schema.productTypes.displayOrder);

            return results.map(rowToProductType);
          },
          catch: (error) => new Error(`Failed to find product types: ${error}`),
        }),

      findBySlug: (slug) =>
        Effect.tryPromise({
          try: async () => {
            const results = await db
              .select()
              .from(schema.productTypes)
              .where(eq(schema.productTypes.slug, slug))
              .limit(1);

            if (results.length === 0) {
              return null;
            }

            return rowToProductType(results[0]!);
          },
          catch: (error) => new Error(`Failed to find product type: ${error}`),
        }),

      create: (productType) =>
        Effect.tryPromise({
          try: async () => {
            const now = new Date();

            await db.insert(schema.productTypes).values({
              slug: productType.slug,
              label: productType.label,
              description: productType.description || null,
              displayOrder: productType.displayOrder ?? 0,
              createdAt: now,
              updatedAt: now,
            });

            const results = await db
              .select()
              .from(schema.productTypes)
              .where(eq(schema.productTypes.slug, productType.slug))
              .limit(1);

            if (results.length === 0) {
              throw new Error('Product type not found after create');
            }

            return rowToProductType(results[0]!);
          },
          catch: (error) => new Error(`Failed to create product type: ${error}`),
        }),

      update: (slug, data) =>
        Effect.tryPromise({
          try: async () => {
            const now = new Date();

            await db
              .update(schema.productTypes)
              .set({
                ...(data.label !== undefined && { label: data.label }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.displayOrder !== undefined && { displayOrder: data.displayOrder }),
                updatedAt: now,
              })
              .where(eq(schema.productTypes.slug, slug));

            const results = await db
              .select()
              .from(schema.productTypes)
              .where(eq(schema.productTypes.slug, slug))
              .limit(1);

            if (results.length === 0) {
              return null;
            }

            return rowToProductType(results[0]!);
          },
          catch: (error) => new Error(`Failed to update product type: ${error}`),
        }),

      delete: (slug) =>
        Effect.tryPromise({
          try: async () => {
            const existing = await db
              .select()
              .from(schema.productTypes)
              .where(eq(schema.productTypes.slug, slug))
              .limit(1);

            if (existing.length === 0) {
              return false;
            }

            await db
              .delete(schema.productTypes)
              .where(eq(schema.productTypes.slug, slug));

            return true;
          },
          catch: (error) => new Error(`Failed to delete product type: ${error}`),
        }),
    };
  })
);
