import { Context, Effect, Layer } from 'every-plugin/effect';
import { eq, like, and, count, sql } from 'drizzle-orm';
import * as schema from '../db/schema';
import type { Product, ProductCategory, ProductImage, ProductVariant, FulfillmentConfig, MockupConfig, VariantAttributes } from '../schema';
import { Database } from './database';

export interface ProductCriteria {
  category?: ProductCategory;
  limit?: number;
  offset?: number;
}

export interface ProductVariantInput {
  id: string;
  name: string;
  sku?: string;
  price: number;
  currency: string;
  attributes?: VariantAttributes;
  externalVariantId?: string;
  fulfillmentConfig?: FulfillmentConfig;
  inStock?: boolean;
}

export interface ProductWithImages {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  category: ProductCategory;
  brand?: string;
  productType?: string;
  images: ProductImage[];
  primaryImage?: string;
  variants: ProductVariantInput[];
  fulfillmentProvider: string;
  externalProductId?: string;
  source: string;
  mockupConfig?: MockupConfig;
}

export class ProductStore extends Context.Tag('ProductStore')<
  ProductStore,
  {
    readonly find: (id: string) => Effect.Effect<Product | null, Error>;
    readonly findMany: (criteria: ProductCriteria) => Effect.Effect<{ products: Product[]; total: number }, Error>;
    readonly search: (query: string, category: ProductCategory | undefined, limit: number) => Effect.Effect<Product[], Error>;
    readonly upsert: (product: ProductWithImages) => Effect.Effect<Product, Error>;
    readonly delete: (id: string) => Effect.Effect<void, Error>;
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
        name: v.name,
        sku: v.sku || undefined,
        price: v.price / 100,
        currency: v.currency,
        attributes: v.attributes || undefined,
        externalVariantId: v.externalVariantId || undefined,
        fulfillmentConfig: v.fulfillmentConfig || undefined,
        inStock: v.inStock,
      }));
    };

    const rowToProduct = async (row: typeof schema.products.$inferSelect): Promise<Product> => {
      const images = await getProductImages(row.id);
      const variants = await getProductVariants(row.id);

      return {
        id: row.id,
        name: row.name,
        description: row.description || undefined,
        price: row.price / 100,
        currency: row.currency,
        category: row.category as ProductCategory,
        brand: row.brand || undefined,
        productType: row.productType || undefined,
        images,
        primaryImage: row.primaryImage || undefined,
        variants,
        fulfillmentProvider: row.fulfillmentProvider,
        externalProductId: row.externalProductId || undefined,
        source: row.source,
        mockupConfig: row.mockupConfig || undefined,
      };
    };

    return {
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
            const { category, limit = 50, offset = 0 } = criteria;

            const whereClause = category
              ? eq(schema.products.category, category)
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

            const conditions = category
              ? and(
                  like(schema.products.name, searchTerm),
                  eq(schema.products.category, category)
                )
              : like(schema.products.name, searchTerm);

            const results = await db
              .select()
              .from(schema.products)
              .where(conditions)
              .limit(limit);

            return await Promise.all(results.map(rowToProduct));
          },
          catch: (error) => new Error(`Failed to search products: ${error}`),
        }),

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
                currency: product.currency,
                category: product.category,
                brand: product.brand || null,
                productType: product.productType || null,
                primaryImage: product.primaryImage || null,
                fulfillmentProvider: product.fulfillmentProvider,
                externalProductId: product.externalProductId || null,
                source: product.source,
                mockupConfig: product.mockupConfig || null,
                createdAt: now,
                updatedAt: now,
              })
              .onConflictDoUpdate({
                target: schema.products.id,
                set: {
                  name: product.name,
                  description: product.description || null,
                  price: Math.round(product.price * 100),
                  currency: product.currency,
                  category: product.category,
                  brand: product.brand || null,
                  productType: product.productType || null,
                  primaryImage: product.primaryImage || null,
                  fulfillmentProvider: product.fulfillmentProvider,
                  externalProductId: product.externalProductId || null,
                  source: product.source,
                  mockupConfig: product.mockupConfig || null,
                  updatedAt: now,
                },
              });

            await db
              .delete(schema.productImages)
              .where(eq(schema.productImages.productId, product.id));

            if (product.images.length > 0) {
              await db.insert(schema.productImages).values(
                product.images.map((img, index) => ({
                  id: img.id || `${product.id}-img-${index}`,
                  productId: product.id,
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
              .where(eq(schema.productVariants.productId, product.id));

            if (product.variants.length > 0) {
              await db.insert(schema.productVariants).values(
                product.variants.map((variant) => ({
                  id: variant.id,
                  productId: product.id,
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
              .where(eq(schema.products.id, product.id))
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
