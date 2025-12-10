import { Context, Effect, Layer } from 'every-plugin/effect';
import type { Product, ProductCategory, Collection } from '../schema';
import type { PrintfulFulfillmentService } from './fulfillment';
import { ProductStore } from '../store';

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

export class ProductService extends Context.Tag("ProductService")<
  ProductService,
  {
    readonly getProducts: (options: { category?: ProductCategory; limit?: number; offset?: number }) => Effect.Effect<{ products: Product[]; total: number }, Error>;
    readonly getProduct: (id: string) => Effect.Effect<{ product: Product }, Error>;
    readonly searchProducts: (options: { query: string; category?: ProductCategory; limit?: number }) => Effect.Effect<{ products: Product[] }, Error>;
    readonly getFeaturedProducts: (limit?: number) => Effect.Effect<{ products: Product[] }, Error>;
    readonly getCollections: () => Effect.Effect<{ collections: Collection[] }, Error>;
    readonly getCollection: (slug: string) => Effect.Effect<{ collection: Collection; products: Product[] }, Error>;
    readonly sync: () => Effect.Effect<{ status: string; count: number }, Error>;
    readonly getSyncStatus: () => Effect.Effect<{
      status: 'idle' | 'running' | 'error';
      lastSuccessAt: number | null;
      lastErrorAt: number | null;
      errorMessage: string | null;
    }, Error>;
  }
>() {}

export const ProductServiceLive = (printfulService: PrintfulFulfillmentService | null) =>
  Layer.effect(
    ProductService,
    Effect.gen(function* () {
      const store = yield* ProductStore;

      const syncFromPrintful = (): Effect.Effect<number, Error> =>
        Effect.gen(function* () {
          if (!printfulService) {
            console.log('[ProductSync] No Printful service configured, skipping sync');
            return 0;
          }

          console.log('[ProductSync] Starting Printful sync...');
          const syncProducts = yield* printfulService.getSyncProducts();
          console.log(`[ProductSync] Found ${syncProducts.length} Printful sync products`);

          let syncedCount = 0;

          for (const syncProduct of syncProducts) {
            try {
              const { sync_product, sync_variants } = yield* printfulService.getSyncProduct(syncProduct.id);
              const products = printfulService.transformSyncProductToProduct(sync_product, sync_variants);

              for (const product of products) {
                yield* store.upsert({
                  ...product,
                  source: 'printful',
                });
                syncedCount++;
              }

              console.log(`[ProductSync] Synced ${products.length} variants from product ${syncProduct.id}`);
            } catch (error) {
              console.error(`[ProductSync] Failed to sync Printful product ${syncProduct.id}:`, error);
            }
          }

          console.log(`[ProductSync] Completed Printful sync: ${syncedCount} products`);
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

        getCollections: () =>
          Effect.succeed({ collections: COLLECTIONS }),

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
            yield* store.setSyncStatus('products', 'running', null, null, null);

            try {
              const count = yield* syncFromPrintful();
              yield* store.setSyncStatus('products', 'idle', new Date(), null, null);
              return { status: 'completed', count };
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
