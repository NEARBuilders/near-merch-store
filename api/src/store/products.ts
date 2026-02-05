import { and, count, eq, inArray, like, lt } from 'drizzle-orm';
import { Context, Effect, Layer } from 'every-plugin/effect';
import * as schema from '../db/schema';
import type { Collection, Product, ProductCriteria, ProductImage, ProductType, ProductVariant, ProductWithImages } from '../schema';
import { Database } from './database';

export class ProductStore extends Context.Tag('ProductStore')<
  ProductStore,
  {
    readonly find: (identifier: string) => Effect.Effect<Product | null, Error>;
    readonly findByPublicKey: (publicKey: string) => Effect.Effect<Product | null, Error>;
    readonly findMany: (criteria: ProductCriteria) => Effect.Effect<{ products: Product[]; total: number }, Error>;
    readonly search: (query: string, limit: number) => Effect.Effect<Product[], Error>;
    readonly upsert: (product: ProductWithImages, syncedAt?: Date) => Effect.Effect<Product, Error>;
    readonly delete: (id: string) => Effect.Effect<void, Error>;
    readonly prune: (source: string, before: Date) => Effect.Effect<number, Error>;
    readonly updateListing: (id: string, listed: boolean) => Effect.Effect<Product | null, Error>;
    readonly updateTags: (id: string, tags: string[]) => Effect.Effect<Product | null, Error>;
    readonly updateFeatured: (id: string, featured: boolean) => Effect.Effect<Product | null, Error>;
    readonly updateProductType: (id: string, productTypeSlug: string | null) => Effect.Effect<Product | null, Error>;
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

    const getProductCollections = async (productId: string): Promise<Collection[]> => {
      const results = await db
        .select({
          slug: schema.collections.slug,
          name: schema.collections.name,
          description: schema.collections.description,
          image: schema.collections.image,
          showInCarousel: schema.collections.showInCarousel,
          carouselOrder: schema.collections.carouselOrder,
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
        showInCarousel: row.showInCarousel,
        carouselOrder: row.carouselOrder,
      }));
    };

    const getProductType = async (productTypeSlug: string | null): Promise<ProductType | undefined> => {
      if (!productTypeSlug) return undefined;
      
      const results = await db
        .select()
        .from(schema.productTypes)
        .where(eq(schema.productTypes.slug, productTypeSlug))
        .limit(1);
      
      if (results.length === 0) return undefined;
      
      const row = results[0]!;
      return {
        slug: row.slug,
        label: row.label,
        description: row.description || undefined,
        displayOrder: row.displayOrder,
      };
    };

    const safeParseJsonArray = (value: unknown, fieldName: string, rowId: string): any[] => {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
          console.error(`[ProductStore] Invalid JSON in ${fieldName} for product ${rowId}: ${value}`);
          return [];
        }
      }
      
      return [];
    };

    const rowToProduct = async (row: typeof schema.products.$inferSelect): Promise<Product> => {
      const images = await getProductImages(row.id);
      const variants = await getProductVariants(row.id);
      const collections = await getProductCollections(row.id);
      const productType = await getProductType(row.productTypeSlug);

      const tags = safeParseJsonArray(row.tags, 'tags', row.id);
      const options = safeParseJsonArray(row.options, 'options', row.id);

      return {
        id: row.id,
        slug: row.slug,
        title: row.name,
        description: row.description || undefined,
        price: row.price / 100,
        currency: row.currency,
        brand: row.brand || undefined,
        productType,
        tags,
        featured: row.featured ?? false,
        collections,
        options,
        images,
        variants,
        designFiles: [],
        fulfillmentProvider: row.fulfillmentProvider,
        externalProductId: row.externalProductId || undefined,
        source: row.source,
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
            const { productTypeSlug, collectionSlugs, tags, featured, limit = 50, offset = 0, includeUnlisted = false } = criteria;

            const conditions = [];

            if (!includeUnlisted) {
              conditions.push(eq(schema.products.listed, true));
            }

            if (productTypeSlug) {
              conditions.push(eq(schema.products.productTypeSlug, productTypeSlug));
            }

            if (featured !== undefined) {
              conditions.push(eq(schema.products.featured, featured));
            }

            const whereClause = conditions.length > 0
              ? and(...conditions)
              : undefined;

            let productIds: string[] | undefined;

            if (collectionSlugs && collectionSlugs.length > 0) {
              const collectionProducts = await db
                .select({ productId: schema.productCollections.productId })
                .from(schema.productCollections)
                .where(inArray(schema.productCollections.collectionSlug, collectionSlugs));
              
              productIds = [...new Set(collectionProducts.map((p) => p.productId))];
              
              if (productIds.length === 0) {
                return { products: [], total: 0 };
              }
            }

            const finalConditions = whereClause
              ? productIds
                ? and(whereClause, inArray(schema.products.id, productIds))
                : whereClause
              : productIds
                ? inArray(schema.products.id, productIds)
                : undefined;

            const [countResult] = await db
              .select({ count: count() })
              .from(schema.products)
              .where(finalConditions);

            const total = Number(countResult?.count ?? 0);

            const results = await db
              .select()
              .from(schema.products)
              .where(finalConditions)
              .limit(limit)
              .offset(offset);

            let products = await Promise.all(results.map(rowToProduct));

            if (tags && tags.length > 0) {
              products = products.filter((product) =>
                tags.some((tag) => product.tags.includes(tag))
              );
            }

            return { products, total };
          },
          catch: (error) => new Error(`Failed to find products: ${error}`),
        }),

      search: (query, limit) =>
        Effect.tryPromise({
          try: async () => {
            const searchTerm = `%${query}%`;

            const conditions = [
              eq(schema.products.listed, true),
            ];

            const results = await db
              .select()
              .from(schema.products)
              .where(and(...conditions))
              .limit(limit);

            const allProducts = await Promise.all(results.map(rowToProduct));
            
            return allProducts.filter((product) => {
              const nameMatch = product.title.toLowerCase().includes(query.toLowerCase());
              const tagMatch = product.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()));
              return nameMatch || tagMatch;
            });
          },
          catch: (error) => new Error(`Failed to search products: ${error}`),
        }),

      upsert: (product) =>
        Effect.tryPromise({
          try: async () => {
            const now = new Date();

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

            const finalId = existingProduct?.id ?? product.id;

            if (existingProduct) {
              await db
                .update(schema.products)
                .set({
                  name: product.name,
                  description: product.description || null,
                  price: Math.round(product.price * 100),
                  currency: product.currency,
                  brand: product.brand || null,
                  productTypeSlug: product.productTypeSlug || null,
                  tags: product.tags || existingProduct.tags || [],
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
                  brand: product.brand || null,
                  productTypeSlug: product.productTypeSlug || null,
                  tags: product.tags || [],
                  options: product.options,
                  thumbnailImage: product.thumbnailImage || null,
                  featured: false,
                  fulfillmentProvider: product.fulfillmentProvider,
                  externalProductId: product.externalProductId || null,
                  source: product.source,
                  createdAt: now,
                  updatedAt: now,
                });
            }

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

      updateTags: (id, tags) =>
        Effect.tryPromise({
          try: async () => {
            const now = new Date();
            await db
              .update(schema.products)
              .set({ tags, updatedAt: now })
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
          catch: (error) => new Error(`Failed to update product tags: ${error}`),
        }),

      updateFeatured: (id, featured) =>
        Effect.tryPromise({
          try: async () => {
            const now = new Date();
            await db
              .update(schema.products)
              .set({ featured, updatedAt: now })
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
          catch: (error) => new Error(`Failed to update product featured status: ${error}`),
        }),

      updateProductType: (id, productTypeSlug) =>
        Effect.tryPromise({
          try: async () => {
            const now = new Date();
            await db
              .update(schema.products)
              .set({ productTypeSlug, updatedAt: now })
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
          catch: (error) => new Error(`Failed to update product type: ${error}`),
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
