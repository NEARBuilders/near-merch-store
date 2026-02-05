import { eq, inArray, desc } from 'drizzle-orm';
import { Context, Effect, Layer } from 'every-plugin/effect';
import * as schema from '../db/schema';
import type { Collection, CollectionFeaturedProduct } from '../schema';
import { Database } from './database';

export class CollectionStore extends Context.Tag('CollectionStore')<
  CollectionStore,
  {
    readonly find: (slug: string) => Effect.Effect<Collection | null, Error>;
    readonly findAll: () => Effect.Effect<Collection[], Error>;
    readonly findCarouselCollections: () => Effect.Effect<Collection[], Error>;
    readonly create: (collection: { name: string; slug: string; description?: string; image?: string; badge?: string }) => Effect.Effect<Collection, Error>;
    readonly update: (slug: string, data: {
      name?: string;
      description?: string;
      image?: string;
      badge?: string;
      carouselTitle?: string;
      carouselDescription?: string;
      showInCarousel?: boolean;
      carouselOrder?: number;
    }) => Effect.Effect<Collection | null, Error>;
    readonly updateFeaturedProduct: (slug: string, productId: string | null) => Effect.Effect<Collection | null, Error>;
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

    const rowToCollection = (row: typeof schema.collections.$inferSelect, featuredProduct?: CollectionFeaturedProduct): Collection => ({
      slug: row.slug,
      name: row.name,
      description: row.description || undefined,
      image: row.image || undefined,
      badge: row.badge || undefined,
      featuredProductId: row.featuredProductId || undefined,
      featuredProduct,
      carouselTitle: row.carouselTitle || undefined,
      carouselDescription: row.carouselDescription || undefined,
      showInCarousel: row.showInCarousel ?? true,
      carouselOrder: row.carouselOrder ?? 0,
    });

    const getFeaturedProduct = async (productId: string | null): Promise<CollectionFeaturedProduct | undefined> => {
      if (!productId) return undefined;
      const productResult = await db
        .select({
          id: schema.products.id,
          name: schema.products.name,
          slug: schema.products.slug,
          price: schema.products.price,
          thumbnailImage: schema.products.thumbnailImage,
        })
        .from(schema.products)
        .where(eq(schema.products.id, productId))
        .limit(1);
      
      if (productResult.length === 0) return undefined;
      const p = productResult[0]!;
      return {
        id: p.id,
        title: p.name,
        slug: p.slug,
        price: p.price / 100,
        thumbnailImage: p.thumbnailImage || undefined,
      };
    };

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

            const row = results[0]!;
            const featuredProduct = await getFeaturedProduct(row.featuredProductId);
            return rowToCollection(row, featuredProduct);
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

            const collections = await Promise.all(
              results.map(async (row) => {
                const featuredProduct = await getFeaturedProduct(row.featuredProductId);
                return rowToCollection(row, featuredProduct);
              })
            );

            return collections;
          },
          catch: (error) => new Error(`Failed to find collections: ${error}`),
        }),

      findCarouselCollections: () =>
        Effect.tryPromise({
          try: async () => {
            const results = await db
              .select()
              .from(schema.collections)
              .where(eq(schema.collections.showInCarousel, true))
              .orderBy(desc(schema.collections.carouselOrder), schema.collections.name);

            const collections = await Promise.all(
              results.map(async (row) => {
                const featuredProduct = await getFeaturedProduct(row.featuredProductId);
                return rowToCollection(row, featuredProduct);
              })
            );

            return collections;
          },
          catch: (error) => new Error(`Failed to find carousel collections: ${error}`),
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
              badge: collection.badge || null,
              showInCarousel: true,
              carouselOrder: 0,
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

      update: (slug, data) =>
        Effect.tryPromise({
          try: async () => {
            const now = new Date();
            await db
              .update(schema.collections)
              .set({
                ...(data.name !== undefined && { name: data.name }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.image !== undefined && { image: data.image }),
                ...(data.badge !== undefined && { badge: data.badge }),
                ...(data.carouselTitle !== undefined && { carouselTitle: data.carouselTitle }),
                ...(data.carouselDescription !== undefined && { carouselDescription: data.carouselDescription }),
                ...(data.showInCarousel !== undefined && { showInCarousel: data.showInCarousel }),
                ...(data.carouselOrder !== undefined && { carouselOrder: data.carouselOrder }),
                updatedAt: now,
              })
              .where(eq(schema.collections.slug, slug));

            const results = await db
              .select()
              .from(schema.collections)
              .where(eq(schema.collections.slug, slug))
              .limit(1);

            if (results.length === 0) {
              return null;
            }

            const row = results[0]!;
            const featuredProduct = await getFeaturedProduct(row.featuredProductId);
            return rowToCollection(row, featuredProduct);
          },
          catch: (error) => new Error(`Failed to update collection: ${error}`),
        }),

      updateFeaturedProduct: (slug, productId) =>
        Effect.tryPromise({
          try: async () => {
            const now = new Date();
            await db
              .update(schema.collections)
              .set({
                featuredProductId: productId,
                updatedAt: now,
              })
              .where(eq(schema.collections.slug, slug));

            const results = await db
              .select()
              .from(schema.collections)
              .where(eq(schema.collections.slug, slug))
              .limit(1);

            if (results.length === 0) {
              return null;
            }

            const row = results[0]!;
            const featuredProduct = await getFeaturedProduct(row.featuredProductId);
            return rowToCollection(row, featuredProduct);
          },
          catch: (error) => new Error(`Failed to update collection featured product: ${error}`),
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
              .select()
              .from(schema.productCollections)
              .innerJoin(
                schema.collections,
                eq(schema.productCollections.collectionSlug, schema.collections.slug)
              )
              .where(eq(schema.productCollections.productId, productId));

            return results.map((row) => rowToCollection(row.collections));
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
