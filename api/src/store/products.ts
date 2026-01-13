import { and, count, eq, like, lt } from 'drizzle-orm';
import { Context, Effect, Layer } from 'every-plugin/effect';
import * as schema from '../db/schema';
import type { Product, ProductCategory, ProductCriteria, ProductImage, ProductVariant, ProductWithImages } from '../schema';
import { Database } from './database';

export class ProductStore extends Context.Tag('ProductStore')<
  ProductStore,
  {
    readonly find: (identifier: string) => Effect.Effect<Product | null, Error>;
    readonly findByPublicKey: (publicKey: string) => Effect.Effect<Product | null, Error>;
    readonly findMany: (criteria: ProductCriteria) => Effect.Effect<{ products: Product[]; total: number }, Error>;
    readonly search: (query: string, category: ProductCategory | undefined, limit: number) => Effect.Effect<Product[], Error>;
    readonly upsert: (product: ProductWithImages, syncedAt?: Date) => Effect.Effect<Product, Error>;
    readonly delete: (id: string) => Effect.Effect<void, Error>;
    readonly prune: (source: string, before: Date) => Effect.Effect<number, Error>;
    readonly updateListing: (id: string, listed: boolean) => Effect.Effect<Product | null, Error>;
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
>() { }

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
        variantIds: img.variantIds || undefined,
        order: img.order,
      }));
    };

    const getProductVariants = async (productId: string): Promise<ProductVariant[]> => {
      const variants = await db
        .select()
        .from(schema.productVariants)
        .where(eq(schema.productVariants.productId, productId));

      return variants.map((v) => ({
        id: v.id,
        title: v.name,
        sku: v.sku || undefined,
        price: v.price / 100,
        currency: v.currency,
        attributes: v.attributes || [],
        externalVariantId: v.externalVariantId || undefined,
        fulfillmentConfig: v.fulfillmentConfig || undefined,
        availableForSale: v.inStock,
      }));
    };

    const rowToProduct = async (row: typeof schema.products.$inferSelect): Promise<Product> => {
      const images = await getProductImages(row.id);
      const variants = await getProductVariants(row.id);

      return {
        id: row.id,
        slug: row.slug,
        title: row.name,
        description: row.description || undefined,
        price: row.price / 100,
        currency: row.currency,
        category: row.category as ProductCategory,
        brand: row.brand || undefined,
        productType: row.productType || undefined,
        options: row.options || [],
        images,
        variants,
        designFiles: [],
        fulfillmentProvider: row.fulfillmentProvider,
        externalProductId: row.externalProductId || undefined,
        source: row.source,
        tags: [],
        thumbnailImage: row.thumbnailImage || undefined,
        listed: row.listed ?? true,
      };
    };

    return {
      find: (identifier) =>
        Effect.tryPromise({
          try: async () => {
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
            
            if (isUUID) {
              const results = await db
                .select()
                .from(schema.products)
                .where(eq(schema.products.id, identifier))
                .limit(1);

              if (results.length > 0) {
                return await rowToProduct(results[0]!);
              }
              return null;
            }
            
            const publicKey = identifier.slice(-12);
            const results = await db
              .select()
              .from(schema.products)
              .where(eq(schema.products.publicKey, publicKey))
              .limit(1);

            if (results.length === 0) {
              return null;
            }

            return await rowToProduct(results[0]!);
          },
          catch: (error) => new Error(`Failed to find product: ${error}`),
        }),

      findByPublicKey: (publicKey) =>
        Effect.tryPromise({
          try: async () => {
            const results = await db
              .select()
              .from(schema.products)
              .where(eq(schema.products.publicKey, publicKey))
              .limit(1);

            if (results.length === 0) {
              return null;
            }

            return await rowToProduct(results[0]!);
          },
          catch: (error) => new Error(`Failed to find product by publicKey: ${error}`),
        }),

      findMany: (criteria) =>
        Effect.tryPromise({
          try: async () => {
            const { category, limit = 50, offset = 0, includeUnlisted = false } = criteria;

            // Build conditions array
            const conditions = [];

            // Only show listed products unless includeUnlisted is true (for admin)
            if (!includeUnlisted) {
              conditions.push(eq(schema.products.listed, true));
            }

            if (category) {
              conditions.push(eq(schema.products.category, category));
            }

            const whereClause = conditions.length > 0
              ? and(...conditions)
              : undefined;

            const [countResult] = await db
              .select({ count: count() })
              .from(schema.products)
              .where(whereClause);

            const total = Number(countResult?.count ?? 0);

            const results = await db
              .select()
              .from(schema.products)
              .where(whereClause)
              .limit(limit)
              .offset(offset);

            const products = await Promise.all(results.map(rowToProduct));

            return { products, total };
          },
          catch: (error) => new Error(`Failed to find products: ${error}`),
        }),

      search: (query, category, limit) =>
        Effect.tryPromise({
          try: async () => {
            const searchTerm = `%${query}%`;

            // Build conditions - always filter by listed=true and search term
            const conditions = [
              eq(schema.products.listed, true),
              like(schema.products.name, searchTerm),
            ];

            if (category) {
              conditions.push(eq(schema.products.category, category));
            }

            const results = await db
              .select()
              .from(schema.products)
              .where(and(...conditions))
              .limit(limit);

            return await Promise.all(results.map(rowToProduct));
          },
          catch: (error) => new Error(`Failed to search products: ${error}`),
        }),

      upsert: (product) =>
        Effect.tryPromise({
          try: async () => {
            const now = new Date();

            // Check if product already exists by externalProductId + fulfillmentProvider (for sync matching)
            let existingProduct: typeof schema.products.$inferSelect | null = null;
            if (product.externalProductId) {
              const existing = await db
                .select()
                .from(schema.products)
                .where(
                  and(
                    eq(schema.products.externalProductId, product.externalProductId),
                    eq(schema.products.fulfillmentProvider, product.fulfillmentProvider)
                  )
                )
                .limit(1);

              if (existing.length > 0) {
                existingProduct = existing[0]!;
              }
            }

            // Use existing ID if product exists, otherwise use new one
            const finalId = existingProduct?.id ?? product.id;

            // Update or insert product
            if (existingProduct) {
              // Update existing product
              await db
                .update(schema.products)
                .set({
                  name: product.name,
                  description: product.description || null,
                  price: Math.round(product.price * 100),
                  currency: product.currency,
                  category: product.category,
                  brand: product.brand || null,
                  productType: product.productType || null,
                  options: product.options,
                  thumbnailImage: product.thumbnailImage || null,
                  fulfillmentProvider: product.fulfillmentProvider,
                  externalProductId: product.externalProductId || null,
                  source: product.source,
                  publicKey: existingProduct.publicKey || product.publicKey,
                  slug: existingProduct.slug || product.slug,
                  lastSyncedAt: now,
                  updatedAt: now,
                })
                .where(eq(schema.products.id, finalId));
            } else {
              // Insert new product
              await db
                .insert(schema.products)
                .values({
                  id: finalId,
                  publicKey: product.publicKey,
                  slug: product.slug,
                  name: product.name,
                  description: product.description || null,
                  price: Math.round(product.price * 100),
                  currency: product.currency,
                  category: product.category,
                  brand: product.brand || null,
                  productType: product.productType || null,
                  options: product.options,
                  thumbnailImage: product.thumbnailImage || null,
                  fulfillmentProvider: product.fulfillmentProvider,
                  externalProductId: product.externalProductId || null,
                  source: product.source,
                  createdAt: now,
                  updatedAt: now,
                });
            }

            // Delete and recreate images
            await db
              .delete(schema.productImages)
              .where(eq(schema.productImages.productId, finalId));

            if (product.images.length > 0) {
              await db.insert(schema.productImages).values(
                product.images.map((img, index) => ({
                  id: img.id || `${finalId}-img-${index}`,
                  productId: finalId,
                  url: img.url,
                  type: img.type,
                  placement: img.placement || null,
                  style: img.style || null,
                  variantIds: img.variantIds || null,
                  order: img.order ?? index,
                  createdAt: now,
                }))
              );
            }

            // Delete and recreate variants
            await db
              .delete(schema.productVariants)
              .where(eq(schema.productVariants.productId, finalId));

            if (product.variants.length > 0) {
              await db.insert(schema.productVariants).values(
                product.variants.map((variant) => ({
                  id: variant.id,
                  productId: finalId,
                  name: variant.name,
                  sku: variant.sku || null,
                  price: Math.round(variant.price * 100),
                  currency: variant.currency,
                  attributes: variant.attributes || null,
                  externalVariantId: variant.externalVariantId || null,
                  fulfillmentConfig: variant.fulfillmentConfig || null,
                  inStock: variant.inStock ?? true,
                  createdAt: now,
                }))
              );
            }

            const results = await db
              .select()
              .from(schema.products)
              .where(eq(schema.products.id, finalId))
              .limit(1);

            if (results.length === 0) {
              throw new Error('Product not found after upsert');
            }

            return await rowToProduct(results[0]!);
          },
          catch: (error) => new Error(`Failed to upsert product: ${error}`),
        }),

      delete: (id) =>
        Effect.tryPromise({
          try: async () => {
            await db.delete(schema.products).where(eq(schema.products.id, id));
          },
          catch: (error) => new Error(`Failed to delete product: ${error}`),
        }),

      updateListing: (id, listed) =>
        Effect.tryPromise({
          try: async () => {
            const now = new Date();
            await db
              .update(schema.products)
              .set({ listed, updatedAt: now })
              .where(eq(schema.products.id, id));

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
          catch: (error) => new Error(`Failed to update product listing: ${error}`),
        }),

      prune: (source: string, before: Date) =>
        Effect.tryPromise({
          try: async () => {
            const staleProducts = await db
              .select({ id: schema.products.id })
              .from(schema.products)
              .where(and(
                eq(schema.products.source, source),
                lt(schema.products.lastSyncedAt, before)
              ));

            if (staleProducts.length > 0) {
              for (const { id } of staleProducts) {
                await db.delete(schema.products).where(eq(schema.products.id, id));
              }
            }

            return staleProducts.length;
          },
          catch: (error) => new Error(`Failed to prune stale products: ${error}`),
        }),

      setSyncStatus: (id, status, lastSuccessAt, lastErrorAt, errorMessage) =>
        Effect.tryPromise({
          try: async () => {
            await db
              .insert(schema.syncState)
              .values({
                id,
                status,
                lastSuccessAt,
                lastErrorAt,
                errorMessage,
              })
              .onConflictDoUpdate({
                target: schema.syncState.id,
                set: {
                  status,
                  lastSuccessAt,
                  lastErrorAt,
                  errorMessage,
                },
              });
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
              lastSuccessAt: row.lastSuccessAt?.getTime() ?? null,
              lastErrorAt: row.lastErrorAt?.getTime() ?? null,
              errorMessage: row.errorMessage,
            };
          },
          catch: (error) => new Error(`Failed to get sync status: ${error}`),
        }),
    };
  })
);
