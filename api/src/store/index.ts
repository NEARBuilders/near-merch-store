import { Context, Effect, Layer } from "every-plugin/effect";
import { eq, and, like, inArray } from "drizzle-orm";
import type { Database as DrizzleDatabase } from "../db";
import * as schema from "../db/schema";
import type { Product, ProductCategory, ProductImage, FulfillmentConfig, MockupConfig } from "../schema";

export interface ProductCriteria {
  id?: string;
  category?: ProductCategory;
  source?: string;
}

export interface ProductWithImages extends Omit<Product, 'images'> {
  images: ProductImage[];
  source: string;
}

export class ProductStore extends Context.Tag("ProductStore")<
  ProductStore,
  {
    readonly upsert: (product: ProductWithImages) => Effect.Effect<void, Error>;
    readonly find: (id: string) => Effect.Effect<Product | null, Error>;
    readonly findMany: (criteria: ProductCriteria & { limit?: number; offset?: number }) => Effect.Effect<{ products: Product[]; total: number }, Error>;
    readonly search: (query: string, category?: ProductCategory, limit?: number) => Effect.Effect<Product[], Error>;
    readonly delete: (id: string) => Effect.Effect<void, Error>;
    readonly deleteBySource: (source: string) => Effect.Effect<number, Error>;
    readonly addImage: (productId: string, image: Omit<ProductImage, 'id'>) => Effect.Effect<ProductImage, Error>;
    readonly getImages: (productId: string) => Effect.Effect<ProductImage[], Error>;
    readonly deleteImages: (productId: string) => Effect.Effect<void, Error>;
    readonly setSyncStatus: (
      id: string,
      status: 'idle' | 'running' | 'error',
      lastSuccessAt: Date | null,
      lastErrorAt: Date | null,
      errorMessage: string | null
    ) => Effect.Effect<void, Error>;
    readonly getSyncStatus: (id: string) => Effect.Effect<{
      status: 'idle' | 'running' | 'error';
      lastSuccessAt: number | null;
      lastErrorAt: number | null;
      errorMessage: string | null;
    }, Error>;
  }
>() {}

export const ProductStoreLive = Layer.effect(
  ProductStore,
  Effect.gen(function* () {
    const db = yield* Database;

    const getProductImages = async (productId: string): Promise<ProductImage[]> => {
      const images = await db
        .select()
        .from(schema.productImages)
        .where(eq(schema.productImages.productId, productId))
        .orderBy(schema.productImages.order);

      return images.map((img) => ({
        id: img.id,
        url: img.url,
        type: img.type as ProductImage['type'],
        placement: img.placement || undefined,
        style: img.style || undefined,
        variantId: img.variantId || undefined,
        order: img.order,
      }));
    };

    const rowToProduct = async (row: typeof schema.products.$inferSelect): Promise<Product> => {
      const images = await getProductImages(row.id);
      
      return {
        id: row.id,
        name: row.name,
        description: row.description || undefined,
        price: row.price / 100,
        currency: row.currency,
        category: row.category as ProductCategory,
        images,
        primaryImage: row.primaryImage || images[0]?.url,
        fulfillmentProvider: row.fulfillmentProvider as 'printful' | 'gelato' | 'manual',
        fulfillmentConfig: row.fulfillmentConfig ? JSON.parse(row.fulfillmentConfig) as FulfillmentConfig : undefined,
        mockupConfig: row.mockupConfig ? JSON.parse(row.mockupConfig) as MockupConfig : undefined,
        sourceProductId: row.sourceProductId || undefined,
      };
    };

    return {
      upsert: (product) =>
        Effect.tryPromise({
          try: async () => {
            const now = new Date();
            
            await db
              .insert(schema.products)
              .values({
                id: product.id,
                name: product.name,
                description: product.description || null,
                price: Math.round(product.price * 100),
                currency: product.currency || 'USD',
                category: product.category,
                primaryImage: product.primaryImage || product.images[0]?.url || null,
                fulfillmentProvider: product.fulfillmentProvider,
                fulfillmentConfig: product.fulfillmentConfig ? JSON.stringify(product.fulfillmentConfig) : null,
                mockupConfig: product.mockupConfig ? JSON.stringify(product.mockupConfig) : null,
                sourceProductId: product.sourceProductId || null,
                source: product.source,
                createdAt: now,
                updatedAt: now,
              })
              .onConflictDoUpdate({
                target: schema.products.id,
                set: {
                  name: product.name,
                  description: product.description || null,
                  price: Math.round(product.price * 100),
                  currency: product.currency || 'USD',
                  category: product.category,
                  primaryImage: product.primaryImage || product.images[0]?.url || null,
                  fulfillmentProvider: product.fulfillmentProvider,
                  fulfillmentConfig: product.fulfillmentConfig ? JSON.stringify(product.fulfillmentConfig) : null,
                  mockupConfig: product.mockupConfig ? JSON.stringify(product.mockupConfig) : null,
                  sourceProductId: product.sourceProductId || null,
                  source: product.source,
                  updatedAt: now,
                },
              });

            await db.delete(schema.productImages).where(eq(schema.productImages.productId, product.id));

            if (product.images.length > 0) {
              await db.insert(schema.productImages).values(
                product.images.map((img, index) => ({
                  id: img.id || `${product.id}-img-${index}`,
                  productId: product.id,
                  url: img.url,
                  type: img.type,
                  placement: img.placement || null,
                  style: img.style || null,
                  variantId: img.variantId || null,
                  order: img.order ?? index,
                  createdAt: now,
                }))
              );
            }
          },
          catch: (error) => new Error(`Failed to upsert product: ${error}`),
        }),

      find: (id) =>
        Effect.tryPromise({
          try: async () => {
            const results = await db
              .select()
              .from(schema.products)
              .where(eq(schema.products.id, id))
              .limit(1);

            if (results.length === 0) {
              return null;
            }

            return await rowToProduct(results[0]!);
          },
          catch: (error) => new Error(`Failed to find product: ${error}`),
        }),

      findMany: (criteria) =>
        Effect.tryPromise({
          try: async () => {
            const { category, source, limit = 50, offset = 0 } = criteria;
            const conditions = [];

            if (category) {
              conditions.push(eq(schema.products.category, category));
            }
            if (source) {
              conditions.push(eq(schema.products.source, source));
            }

            const countQuery = conditions.length > 0
              ? db.select().from(schema.products).where(and(...conditions))
              : db.select().from(schema.products);

            const allResults = await countQuery;
            const total = allResults.length;

            const query = conditions.length > 0
              ? db.select().from(schema.products).where(and(...conditions)).limit(limit).offset(offset)
              : db.select().from(schema.products).limit(limit).offset(offset);

            const results = await query;

            const products = await Promise.all(results.map(rowToProduct));

            return { products, total };
          },
          catch: (error) => new Error(`Failed to find products: ${error}`),
        }),

      search: (query, category, limit = 20) =>
        Effect.tryPromise({
          try: async () => {
            const conditions = [];

            if (query) {
              conditions.push(like(schema.products.name, `%${query}%`));
            }
            if (category) {
              conditions.push(eq(schema.products.category, category));
            }

            const dbQuery = conditions.length > 0
              ? db.select().from(schema.products).where(and(...conditions)).limit(limit)
              : db.select().from(schema.products).limit(limit);

            const results = await dbQuery;

            return await Promise.all(results.map(rowToProduct));
          },
          catch: (error) => new Error(`Failed to search products: ${error}`),
        }),

      delete: (id) =>
        Effect.tryPromise({
          try: async () => {
            await db.delete(schema.products).where(eq(schema.products.id, id));
          },
          catch: (error) => new Error(`Failed to delete product: ${error}`),
        }),

      deleteBySource: (source) =>
        Effect.tryPromise({
          try: async () => {
            const result = await db.delete(schema.products).where(eq(schema.products.source, source));
            return result.rowsAffected;
          },
          catch: (error) => new Error(`Failed to delete products by source: ${error}`),
        }),

      addImage: (productId, image) =>
        Effect.tryPromise({
          try: async () => {
            const id = `${productId}-img-${Date.now()}`;
            const now = new Date();

            await db.insert(schema.productImages).values({
              id,
              productId,
              url: image.url,
              type: image.type,
              placement: image.placement || null,
              style: image.style || null,
              variantId: image.variantId || null,
              order: image.order ?? 0,
              createdAt: now,
            });

            return { id, ...image } as ProductImage;
          },
          catch: (error) => new Error(`Failed to add image: ${error}`),
        }),

      getImages: (productId) =>
        Effect.tryPromise({
          try: async () => getProductImages(productId),
          catch: (error) => new Error(`Failed to get images: ${error}`),
        }),

      deleteImages: (productId) =>
        Effect.tryPromise({
          try: async () => {
            await db.delete(schema.productImages).where(eq(schema.productImages.productId, productId));
          },
          catch: (error) => new Error(`Failed to delete images: ${error}`),
        }),

      setSyncStatus: (id, status, lastSuccessAt, lastErrorAt, errorMessage) =>
        Effect.tryPromise({
          try: async () => {
            const existing = await db
              .select()
              .from(schema.syncState)
              .where(eq(schema.syncState.id, id))
              .limit(1);

            const values = {
              status,
              lastSuccessAt: lastSuccessAt || null,
              lastErrorAt: lastErrorAt || null,
              errorMessage: errorMessage || null,
            };

            if (existing.length > 0) {
              await db
                .update(schema.syncState)
                .set(values)
                .where(eq(schema.syncState.id, id));
            } else {
              await db
                .insert(schema.syncState)
                .values({
                  id,
                  ...values,
                });
            }
          },
          catch: (error) => new Error(`Failed to set sync status: ${error}`),
        }),

      getSyncStatus: (id) =>
        Effect.tryPromise({
          try: async () => {
            const results = await db
              .select()
              .from(schema.syncState)
              .where(eq(schema.syncState.id, id))
              .limit(1);

            if (results.length === 0) {
              return {
                status: 'idle' as const,
                lastSuccessAt: null,
                lastErrorAt: null,
                errorMessage: null,
              };
            }

            const row = results[0]!;
            return {
              status: row.status as 'idle' | 'running' | 'error',
              lastSuccessAt: row.lastSuccessAt ? Math.floor(row.lastSuccessAt.getTime() / 1000) : null,
              lastErrorAt: row.lastErrorAt ? Math.floor(row.lastErrorAt.getTime() / 1000) : null,
              errorMessage: row.errorMessage,
            };
          },
          catch: (error) => new Error(`Failed to get sync status: ${error}`),
        }),
    };
  })
);

export class Database extends Context.Tag("Database")<Database, DrizzleDatabase>() {}

export const DatabaseLive = (url: string, authToken?: string) =>
  Layer.sync(Database, () => {
    const { createDatabase } = require("../db");
    return createDatabase(url, authToken);
  });
