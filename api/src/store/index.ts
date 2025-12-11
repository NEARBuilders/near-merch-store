import { Context, Effect, Layer } from "every-plugin/effect";
import { eq, and, like } from "drizzle-orm";
import type { Database as DrizzleDatabase } from "../db";
import * as schema from "../db/schema";
import type { Product, ProductCategory, FulfillmentConfig } from "../schema";

export interface ProductCriteria {
  id?: string;
  category?: ProductCategory;
  source?: string;
}

export class ProductStore extends Context.Tag("ProductStore")<
  ProductStore,
  {
    readonly upsert: (product: Product & { source: string }) => Effect.Effect<void, Error>;
    readonly find: (id: string) => Effect.Effect<Product | null, Error>;
    readonly findMany: (criteria: ProductCriteria & { limit?: number; offset?: number }) => Effect.Effect<{ products: Product[]; total: number }, Error>;
    readonly search: (query: string, category?: ProductCategory, limit?: number) => Effect.Effect<Product[], Error>;
    readonly delete: (id: string) => Effect.Effect<void, Error>;
    readonly deleteBySource: (source: string) => Effect.Effect<number, Error>;
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

    return {
      upsert: (product) =>
        Effect.tryPromise({
          try: async () => {
            await db
              .insert(schema.products)
              .values({
                id: product.id,
                name: product.name,
                description: product.description || null,
                price: Math.round(product.price * 100),
                currency: product.currency || 'USD',
                category: product.category,
                image: product.image || null,
                fulfillmentProvider: product.fulfillmentProvider,
                fulfillmentConfig: product.fulfillmentConfig ? JSON.stringify(product.fulfillmentConfig) : null,
                source: product.source,
                updatedAt: new Date(),
              })
              .onConflictDoUpdate({
                target: schema.products.id,
                set: {
                  name: product.name,
                  description: product.description || null,
                  price: Math.round(product.price * 100),
                  currency: product.currency || 'USD',
                  category: product.category,
                  image: product.image || null,
                  fulfillmentProvider: product.fulfillmentProvider,
                  fulfillmentConfig: product.fulfillmentConfig ? JSON.stringify(product.fulfillmentConfig) : null,
                  source: product.source,
                  updatedAt: new Date(),
                },
              });
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

            const row = results[0]!;
            return {
              id: row.id,
              name: row.name,
              description: row.description || undefined,
              price: row.price / 100,
              currency: row.currency,
              category: row.category as ProductCategory,
              image: row.image || '',
              fulfillmentProvider: row.fulfillmentProvider as 'printful' | 'gelato' | 'manual',
              fulfillmentConfig: row.fulfillmentConfig ? JSON.parse(row.fulfillmentConfig) as FulfillmentConfig : undefined,
            } satisfies Product;
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

            const products = results.map((row) => ({
              id: row.id,
              name: row.name,
              description: row.description || undefined,
              price: row.price / 100,
              currency: row.currency,
              category: row.category as ProductCategory,
              image: row.image || '',
              fulfillmentProvider: row.fulfillmentProvider as 'printful' | 'gelato' | 'manual',
              fulfillmentConfig: row.fulfillmentConfig ? JSON.parse(row.fulfillmentConfig) as FulfillmentConfig : undefined,
            })) satisfies Product[];

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

            return results.map((row) => ({
              id: row.id,
              name: row.name,
              description: row.description || undefined,
              price: row.price / 100,
              currency: row.currency,
              category: row.category as ProductCategory,
              image: row.image || '',
              fulfillmentProvider: row.fulfillmentProvider as 'printful' | 'gelato' | 'manual',
              fulfillmentConfig: row.fulfillmentConfig ? JSON.parse(row.fulfillmentConfig) as FulfillmentConfig : undefined,
            })) satisfies Product[];
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
