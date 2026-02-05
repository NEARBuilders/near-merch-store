import { eq, inArray } from 'drizzle-orm';
import { Context, Effect, Layer } from 'every-plugin/effect';
import * as schema from '../db/schema';
import type { Collection } from '../schema';
import { Database } from './database';

export class CollectionStore extends Context.Tag('CollectionStore')<
  CollectionStore,
  {
    readonly find: (slug: string) => Effect.Effect<Collection | null, Error>;
    readonly findAll: () => Effect.Effect<Collection[], Error>;
    readonly create: (collection: { name: string; slug: string; description?: string; image?: string }) => Effect.Effect<Collection, Error>;
    readonly delete: (slug: string) => Effect.Effect<void, Error>;
    readonly getProductCollections: (productId: string) => Effect.Effect<Collection[], Error>;
    readonly setProductCollections: (productId: string, collectionSlugs: string[]) => Effect.Effect<void, Error>;
    readonly getProductIdsByCollection: (slug: string) => Effect.Effect<string[], Error>;
  }
>() { }

export const CollectionStoreLive = Layer.effect(
  CollectionStore,
  Effect.gen(function* () {
    const db = yield* Database;

    const rowToCollection = (row: typeof schema.collections.$inferSelect): Collection => ({
      slug: row.slug,
      name: row.name,
      description: row.description || undefined,
      image: row.image || undefined,
    });

    return {
      find: (slug) =>
        Effect.tryPromise({
          try: async () => {
            const results = await db
              .select()
              .from(schema.collections)
              .where(eq(schema.collections.slug, slug))
              .limit(1);

            if (results.length === 0) {
              return null;
            }

            return rowToCollection(results[0]!);
          },
          catch: (error) => new Error(`Failed to find collection: ${error}`),
        }),

      findAll: () =>
        Effect.tryPromise({
          try: async () => {
            const results = await db
              .select()
              .from(schema.collections)
              .orderBy(schema.collections.name);

            return results.map(rowToCollection);
          },
          catch: (error) => new Error(`Failed to find collections: ${error}`),
        }),

      create: (collection) =>
        Effect.tryPromise({
          try: async () => {
            const now = new Date();
            await db.insert(schema.collections).values({
              slug: collection.slug,
              name: collection.name,
              description: collection.description || null,
              image: collection.image || null,
              createdAt: now,
              updatedAt: now,
            });

            const results = await db
              .select()
              .from(schema.collections)
              .where(eq(schema.collections.slug, collection.slug))
              .limit(1);

            if (results.length === 0) {
              throw new Error('Collection not found after creation');
            }

            return rowToCollection(results[0]!);
          },
          catch: (error) => new Error(`Failed to create collection: ${error}`),
        }),

      delete: (slug) =>
        Effect.tryPromise({
          try: async () => {
            await db.delete(schema.collections).where(eq(schema.collections.slug, slug));
          },
          catch: (error) => new Error(`Failed to delete collection: ${error}`),
        }),

      getProductCollections: (productId) =>
        Effect.tryPromise({
          try: async () => {
            const results = await db
              .select({
                slug: schema.collections.slug,
                name: schema.collections.name,
                description: schema.collections.description,
                image: schema.collections.image,
              })
              .from(schema.productCollections)
              .innerJoin(
                schema.collections,
                eq(schema.productCollections.collectionSlug, schema.collections.slug)
              )
              .where(eq(schema.productCollections.productId, productId));

            return results.map((row) => ({
              slug: row.slug,
              name: row.name,
              description: row.description || undefined,
              image: row.image || undefined,
            }));
          },
          catch: (error) => new Error(`Failed to get product collections: ${error}`),
        }),

      setProductCollections: (productId, collectionSlugs) =>
        Effect.tryPromise({
          try: async () => {
            await db
              .delete(schema.productCollections)
              .where(eq(schema.productCollections.productId, productId));

            if (collectionSlugs.length > 0) {
              const validCollections = await db
                .select({ slug: schema.collections.slug })
                .from(schema.collections)
                .where(inArray(schema.collections.slug, collectionSlugs));

              const validSlugs = validCollections.map((c) => c.slug);

              if (validSlugs.length > 0) {
                await db.insert(schema.productCollections).values(
                  validSlugs.map((slug) => ({
                    productId,
                    collectionSlug: slug,
                  }))
                );
              }
            }
          },
          catch: (error) => new Error(`Failed to set product collections: ${error}`),
        }),

      getProductIdsByCollection: (slug) =>
        Effect.tryPromise({
          try: async () => {
            const results = await db
              .select({ productId: schema.productCollections.productId })
              .from(schema.productCollections)
              .where(eq(schema.productCollections.collectionSlug, slug));

            return results.map((r) => r.productId);
          },
          catch: (error) => new Error(`Failed to get products by collection: ${error}`),
        }),
    };
  })
);
