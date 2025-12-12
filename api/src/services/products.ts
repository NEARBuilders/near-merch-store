import { Context, Effect, Layer } from 'every-plugin/effect';
import type { MarketplaceRuntime, FulfillmentProvider } from '../runtime';
import type { Collection, Product, ProductCategory, ProductImage } from '../schema';
import { ProductStore, type ProductWithImages } from '../store';
import type { ProviderProduct, ProviderVariant } from './fulfillment/schema';

export const COLLECTIONS: Collection[] = [
  { slug: 'men', name: 'Men', description: "Men's apparel and accessories" },
  { slug: 'women', name: 'Women', description: "Women's apparel and accessories" },
  { slug: 'accessories', name: 'Accessories', description: 'Bags, hats, and more' },
  { slug: 'exclusives', name: 'Exclusives', description: 'Limited edition items' },
];

function categoryFromSlug(slug: string): ProductCategory | undefined {
  const map: Record<string, ProductCategory> = {
    men: 'Men',
    women: 'Women',
    accessories: 'Accessories',
    exclusives: 'Exclusives',
  };
  return map[slug];
}

function getCollectionBySlug(slug: string): Collection | undefined {
  return COLLECTIONS.find((c) => c.slug === slug);
}

export class ProductService extends Context.Tag('ProductService')<
  ProductService,
  {
    readonly getProducts: (options: {
      category?: ProductCategory;
      limit?: number;
      offset?: number;
    }) => Effect.Effect<{ products: Product[]; total: number }, Error>;
    readonly getProduct: (id: string) => Effect.Effect<{ product: Product }, Error>;
    readonly searchProducts: (options: {
      query: string;
      category?: ProductCategory;
      limit?: number;
    }) => Effect.Effect<{ products: Product[] }, Error>;
    readonly getFeaturedProducts: (limit?: number) => Effect.Effect<{ products: Product[] }, Error>;
    readonly getCollections: () => Effect.Effect<{ collections: Collection[] }, Error>;
    readonly getCollection: (
      slug: string
    ) => Effect.Effect<{ collection: Collection; products: Product[] }, Error>;
    readonly sync: () => Effect.Effect<{ status: string; count: number }, Error>;
    readonly getSyncStatus: () => Effect.Effect<
      {
        status: 'idle' | 'running' | 'error';
        lastSuccessAt: number | null;
        lastErrorAt: number | null;
        errorMessage: string | null;
      },
      Error
    >;
  }
>() {}

function transformVariantToProduct(
  providerName: string,
  product: ProviderProduct,
  variant: ProviderVariant
): ProductWithImages {
  const images: ProductImage[] = [];
  const thumbnailUrl = product.thumbnailUrl;

  if (thumbnailUrl) {
    images.push({
      id: `catalog-${variant.id}`,
      url: thumbnailUrl,
      type: 'catalog',
      order: 0,
    });
  }

  return {
    id: `${providerName}-${variant.id}`,
    name: variant.name || product.name,
    description: product.description || product.name,
    price: variant.retailPrice,
    currency: variant.currency,
    category: 'Exclusives',
    images,
    primaryImage: thumbnailUrl,
    fulfillmentProvider: providerName as 'printful' | 'gelato' | 'manual',
    fulfillmentConfig: {
      printfulSyncVariantId: providerName === 'printful' ? parseInt(variant.id) : undefined,
      printfulVariantId: variant.catalogVariantId,
      printfulProductId: variant.catalogProductId,
      gelatoProductUid: providerName === 'gelato' ? String(product.sourceId) : undefined,
      fileUrl: variant.files?.[0]?.url || null,
    },
    mockupConfig: {
      styles: ['Lifestyle', 'Flat'],
      placements: ['front'],
      format: 'jpg',
      generateOnSync: true,
    },
    sourceProductId: String(product.sourceId),
    source: providerName,
  };
}

export const ProductServiceLive = (runtime: MarketplaceRuntime) =>
  Layer.effect(
    ProductService,
    Effect.gen(function* () {
      const store = yield* ProductStore;
      const { providers } = runtime;

      const syncFromProvider = (
        provider: FulfillmentProvider
      ): Effect.Effect<number, Error> =>
        Effect.gen(function* () {
          console.log(`[ProductSync] Starting sync from ${provider.name}...`);

          const { products } = yield* Effect.tryPromise({
            try: () => provider.client.getProducts({ limit: 100, offset: 0 }),
            catch: (e) => new Error(`Failed to fetch products from ${provider.name}: ${e}`),
          });

          console.log(`[ProductSync] Found ${products.length} products from ${provider.name}`);

          let syncedCount = 0;

          for (const product of products) {
            for (const variant of product.variants) {
              try {
                const localProduct = transformVariantToProduct(provider.name, product, variant);
                yield* store.upsert(localProduct);
                syncedCount++;
              } catch (error) {
                console.error(
                  `[ProductSync] Failed to sync variant ${variant.id} from ${provider.name}:`,
                  error
                );
              }
            }
          }

          console.log(`[ProductSync] Completed ${provider.name} sync: ${syncedCount} variants`);
          return syncedCount;
        });

      return {
        getProducts: (options) =>
          Effect.gen(function* () {
            const { category, limit = 50, offset = 0 } = options;
            return yield* store.findMany({ category, limit, offset });
          }),

        getProduct: (id) =>
          Effect.gen(function* () {
            const product = yield* store.find(id);
            if (!product) {
              return yield* Effect.fail(new Error(`Product not found: ${id}`));
            }
            return { product };
          }),

        searchProducts: (options) =>
          Effect.gen(function* () {
            const { query, category, limit = 20 } = options;
            const products = yield* store.search(query, category, limit);
            return { products };
          }),

        getFeaturedProducts: (limit = 8) =>
          Effect.gen(function* () {
            const result = yield* store.findMany({ limit, offset: 0 });
            return { products: result.products };
          }),

        getCollections: () => Effect.succeed({ collections: COLLECTIONS }),

        getCollection: (slug) =>
          Effect.gen(function* () {
            const collection = getCollectionBySlug(slug);
            if (!collection) {
              return yield* Effect.fail(new Error(`Collection not found: ${slug}`));
            }

            const category = categoryFromSlug(slug);
            const result = category
              ? yield* store.findMany({ category, limit: 100, offset: 0 })
              : { products: [], total: 0 };

            return { collection, products: result.products };
          }),

        sync: () =>
          Effect.gen(function* () {
            if (providers.length === 0) {
              console.log('[ProductSync] No providers configured, skipping sync');
              return { status: 'completed', count: 0 };
            }

            yield* store.setSyncStatus('products', 'running', null, null, null);

            try {
              const results = yield* Effect.all(
                providers.map((p) => syncFromProvider(p)),
                { concurrency: 'unbounded' }
              );

              const totalCount = results.reduce((sum, count) => sum + count, 0);
              yield* store.setSyncStatus('products', 'idle', new Date(), null, null);
              return { status: 'completed', count: totalCount };
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              yield* store.setSyncStatus('products', 'error', null, new Date(), errorMessage);
              return yield* Effect.fail(new Error(`Sync failed: ${errorMessage}`));
            }
          }),

        getSyncStatus: () =>
          Effect.gen(function* () {
            return yield* store.getSyncStatus('products');
          }),
      };
    })
  );
