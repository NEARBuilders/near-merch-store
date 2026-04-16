import { Context, Effect, Layer } from 'every-plugin/effect';
import type { FulfillmentProvider, MarketplaceRuntime } from '../runtime';
import type { Collection, FulfillmentConfig, Product, ProductImage, ProductOption, ProductCriteria, ProductMetadata } from '../schema';
import { ProductStore, CollectionStore, type ProductVariantInput, type ProductWithImages } from '../store';
import type { ProviderProduct } from './fulfillment/schema';
import { generateProductId, generatePublicKey, generateSlug } from '../utils/product-ids';
import { syncProgressStore } from './sync-progress';
import { createSyncLogger, SyncLogger } from './fulfillment/printful/logger';

export class ProductService extends Context.Tag('ProductService')<
  ProductService,
  {
    readonly getProducts: (options: ProductCriteria) => Effect.Effect<{ products: Product[]; total: number }, Error>;
    readonly getProduct: (id: string) => Effect.Effect<{ product: Product }, Error>;
    readonly searchProducts: (options: {
      query: string;
      limit?: number;
    }) => Effect.Effect<{ products: Product[] }, Error>;
    readonly getFeaturedProducts: (limit?: number) => Effect.Effect<{ products: Product[] }, Error>;
    readonly getCollections: () => Effect.Effect<{ collections: Collection[] }, Error>;
    readonly getCollection: (
      slug: string
    ) => Effect.Effect<{ collection: Collection; products: Product[] }, Error>;
    readonly getCarouselCollections: () => Effect.Effect<{ collections: Collection[] }, Error>;
    readonly updateCollection: (
      slug: string,
      data: {
        name?: string;
        description?: string;
        image?: string;
        badge?: string;
        carouselTitle?: string;
        carouselDescription?: string;
        showInCarousel?: boolean;
        carouselOrder?: number;
      }
    ) => Effect.Effect<{ collection: Collection | null }, Error>;
    readonly updateCollectionFeaturedProduct: (
      slug: string,
      productId: string | null
    ) => Effect.Effect<{ collection: Collection | null }, Error>;
    readonly sync: () => Effect.Effect<{
      status: 'idle' | 'running' | 'error' | 'completed';
      count?: number;
      removed?: number;
      failed?: number;
      syncStartedAt?: string;
      syncDuration?: number;
    }, Error>;
    readonly getSyncStatus: () => Effect.Effect<
      {
        status: 'idle' | 'running' | 'error';
        lastSuccessAt: number | null;
        lastErrorAt: number | null;
        errorMessage: string | null;
        syncStartedAt: number | null;
        updatedAt: number;
        errorData: Record<string, any> | null;
      },
      Error
    >;
    readonly updateProductListing: (
      id: string,
      listed: boolean
    ) => Effect.Effect<{ success: boolean; product?: Product }, Error>;
    readonly updateProductTags: (
      id: string,
      tags: string[]
    ) => Effect.Effect<{ success: boolean; product?: Product }, Error>;
    readonly updateProductFeatured: (
      id: string,
      featured: boolean
    ) => Effect.Effect<{ success: boolean; product?: Product }, Error>;
    readonly updateProductCollections: (
      id: string,
      collectionSlugs: string[]
    ) => Effect.Effect<{ success: boolean; product?: Product }, Error>;
    readonly getCategories: () => Effect.Effect<{ categories: Collection[] }, Error>;
    readonly createCategory: (data: {
      name: string;
      slug: string;
      description?: string;
      image?: string;
    }) => Effect.Effect<{ category: Collection }, Error>;
    readonly deleteCategory: (slug: string) => Effect.Effect<{ success: boolean }, Error>;
  }
>() { }

function transformProviderProduct(
  providerName: string,
  product: ProviderProduct
): ProductWithImages {
  const firstVariantWithFiles = product.variants.find(v => v.files?.length);
  const firstFiles = firstVariantWithFiles?.files || [];

  const imageMap = new Map<string, ProductImage>();
  const thumbnailUrl = product.thumbnailUrl;

  if (thumbnailUrl) {
    imageMap.set(thumbnailUrl, {
      id: `catalog-${product.sourceId}`,
      url: thumbnailUrl,
      type: providerName === 'lulu' ? 'preview' : 'catalog',
      order: 0,
      variantIds: providerName === 'lulu'
        ? product.variants.map((variant) => `${providerName}-variant-${variant.id}`)
        : [],
    });
  }

  let imageOrder = 1;
  for (const variant of product.variants) {
    const variantId = `${providerName}-variant-${variant.id}`;

    if (!variant.files) continue;
    for (const file of variant.files) {
      const url = file.url;
      if (!url) continue;

      if (!imageMap.has(url)) {
        const imageId = `file-${file.assetId}-${variant.id}`;

        imageMap.set(url, {
          id: imageId,
          url,
          type: file.slot === 'preview' ? 'preview' : 'detail',
          placement: file.slot && file.slot !== 'preview' && file.slot !== 'default' ? file.slot : undefined,
          order: imageOrder++,
          variantIds: [variantId],
        });
      } else {
        const img = imageMap.get(url)!;
        if (!img.variantIds) img.variantIds = [];
        if (!img.variantIds.includes(variantId)) {
          img.variantIds.push(variantId);
        }
      }
    }
  }

  const images = Array.from(imageMap.values()).sort((a, b) => a.order - b.order);

  const optionsMap = new Map<string, Set<string>>();
  for (const variant of product.variants) {
    if (variant.size) {
      if (!optionsMap.has('Size')) optionsMap.set('Size', new Set());
      optionsMap.get('Size')!.add(variant.size);
    }
    if (variant.color) {
      if (!optionsMap.has('Color')) optionsMap.set('Color', new Set());
      optionsMap.get('Color')!.add(variant.color);
    }
  }

  const options: ProductOption[] = Array.from(optionsMap.entries()).map(([name, values], index) => ({
    id: `${providerName}-option-${product.sourceId}-${index}`,
    name,
    values: Array.from(values),
    position: index + 1,
  }));

  const basePrice = product.variants.length > 0
    ? Math.min(...product.variants.map(v => v.retailPrice))
    : 0;

  const firstVariant = product.variants[0];
  const baseCurrency = firstVariant?.currency || 'USD';
  const providerDownloads = product.metadata?.downloads;

  const variants: ProductVariantInput[] = product.variants.map((variant) => {
    const variantId = String(variant.id);

    const fulfillmentConfig: FulfillmentConfig = {
      externalVariantId: providerName === 'printful' ? String(variant.id) : variantId,
      externalProductId: String(product.sourceId),
      designFiles: variant.files?.map(f => ({ placement: f.slot || 'default', url: f.url })),
      providerData: providerName === 'printful'
        ? {
          catalogVariantId: variant.catalogVariantId,
          catalogProductId: variant.catalogProductId,
        }
        : providerName === 'gelato'
          ? { productUid: String(product.sourceId) }
          : providerName === 'lulu'
            ? variant.providerData || {}
          : {},
    };

    const attributes = providerName === 'lulu'
      ? []
      : [
          { name: 'Size', value: variant.size || 'One Size' },
          ...(variant.color ? [{ name: 'Color', value: variant.color }] : []),
        ];

    return {
      id: `${providerName}-variant-${variantId}`,
      name: variant.name || 'One Size',
      sku: variant.sku,
      price: variant.retailPrice,
      currency: variant.currency,
      attributes,
      externalVariantId: variantId,
      fulfillmentConfig,
      inStock: true,
    };
  });

  const id = generateProductId();
  const publicKey = generatePublicKey();
  const slug = generateSlug(product.name, publicKey);

  return {
    id,
    publicKey,
    slug,
    name: product.name,
    description: product.description || undefined,
    price: basePrice,
    currency: baseCurrency,
    productTypeSlug: undefined,
    tags: [],
    options,
    images,
    thumbnailImage: thumbnailUrl,
    variants,
    designFiles: firstFiles?.map(f => ({ placement: f.slot || 'default', url: f.url })) || [],
    fulfillmentProvider: providerName,
    externalProductId: String(product.sourceId),
    source: providerName,
    metadata: {
      fees: [],
      providerDetails: product.providerDetails,
      downloads: providerDownloads,
    },
  };
}

export const ProductServiceLive = (runtime: MarketplaceRuntime) =>
  Layer.effect(
    ProductService,
    Effect.gen(function* () {
      const store = yield* ProductStore;
      const collectionStore = yield* CollectionStore;
      const { providers } = runtime;

      const extractValidationIssues = (err: unknown): string | null => {
        const error = err as Record<string, unknown>;

        if (error?.issues && Array.isArray(error.issues)) {
          return error.issues
            .map((issue: { path?: string[]; message?: string }) =>
              `  - ${issue.path?.join('.') || '?'}: ${issue.message || 'unknown'}`)
            .join('\n');
        }

        const cause = error?.cause as Record<string, unknown> | undefined;
        if (cause?.issues && Array.isArray(cause.issues)) {
          return cause.issues
            .map((issue: { path?: string[]; message?: string }) =>
              `  - ${issue.path?.join('.') || '?'}: ${issue.message || 'unknown'}`)
            .join('\n');
        }

        return null;
      };

      const syncFromProvider = (
        provider: FulfillmentProvider,
        syncStartedAt: Date
      ): Effect.Effect<{ synced: number; removed: number; failed: number; error?: string }, Error> =>
        Effect.gen(function* () {
          // Create structured logger for this sync
          const logger = createSyncLogger(`${provider.name}-${Date.now()}`);
          logger.logPhase('init', `Starting sync from ${provider.name}`);

          syncProgressStore.updateProvider(provider.name, {
            status: 'fetching',
            phase: 'fetch_products',
            total: 0,
            synced: 0,
            failed: 0,
          });

          // Pagination: Fetch all products across multiple pages
          const PAGE_SIZE = 100;
          let allProducts: ProviderProduct[] = [];
          let totalFetchFailed: Array<{ id: string; error: string }> = [];
          let offset = 0;
          let hasMore = true;
          let pageCount = 0;

          logger.logPhase('fetch_products', 'Fetching product pages');

          while (hasMore) {
            pageCount++;

            const pageResult = yield* Effect.tryPromise({
              try: () => provider.client.browseCatalog({ limit: PAGE_SIZE, offset }),
              catch: (e) => {
                const issues = extractValidationIssues(e);
                if (issues) {
                  logger.logFailure(`Page ${pageCount}`, `Validation error: ${issues}`);
                  return new Error(`Validation failed for ${provider.name} page ${pageCount}:\n${issues}`);
                }

                const errorMessage = e instanceof Error ? e.message : String(e);
                return new Error(`Failed to fetch products from ${provider.name} page ${pageCount}: ${errorMessage}`);
              },
            });
            const products: any[] = pageResult.products || [];
            const total = pageResult.total || 0;
            const pageFailed: any[] = [];
            
            allProducts = [...allProducts, ...products];
            totalFetchFailed = [...totalFetchFailed, ...pageFailed];

            // Log progress every few pages
            if (pageCount === 1 || pageCount % 5 === 0 || !hasMore) {
              logger.logProgress({
                phase: 'fetch_products',
                current: allProducts.length,
                total: total || allProducts.length + 10, // Estimate if no total
                failed: totalFetchFailed.length,
              });
            }

            // Check if there are more pages
            if (products.length < PAGE_SIZE || allProducts.length >= total) {
              hasMore = false;
            } else {
              offset += PAGE_SIZE;
            }

            // Safety limit: don't fetch more than 1000 pages (100k products)
            if (pageCount >= 1000) {
              logger.logPhase('fetch_products', 'Reached maximum page limit (1000), stopping pagination');
              hasMore = false;
            }
          }

          logger.logPhase('sync_to_db', `Fetched ${allProducts.length} products, syncing to database`);

          syncProgressStore.updateProvider(provider.name, {
            status: 'syncing',
            phase: 'sync_to_db',
            total: allProducts.length,
            synced: 0,
            failed: totalFetchFailed.length,
          });

          let syncedCount = 0;
          let failedCount = totalFetchFailed.length;
          const PROGRESS_UPDATE_INTERVAL = 10;

          for (let i = 0; i < allProducts.length; i++) {
            const product = allProducts[i];
            if (!product) continue;
            
            try {
              const localProduct = transformProviderProduct(provider.name, product);

              yield* store.upsert(localProduct);
              syncedCount++;

              // Log individual product success only occasionally to avoid spam
              if (syncedCount <= 5 || syncedCount % 20 === 0) {
                logger.logSuccess(localProduct.name, `${localProduct.variants.length} variants`);
              }

              if (syncedCount % PROGRESS_UPDATE_INTERVAL === 0 || i === allProducts.length - 1) {
                syncProgressStore.updateProvider(provider.name, {
                  status: 'syncing',
                  phase: 'sync_to_db',
                  total: allProducts.length,
                  synced: syncedCount,
                  failed: failedCount,
                  currentProduct: localProduct.name,
                });
              }
            } catch (error) {
              failedCount++;
              const productName = typeof product.name === 'string' ? product.name : String(product.id);
              logger.logFailure(productName, error);

              syncProgressStore.updateProvider(provider.name, {
                status: 'syncing',
                phase: 'sync_to_db',
                total: allProducts.length,
                synced: syncedCount,
                failed: failedCount,
                currentProduct: product.name,
                message: `Failed to sync: ${error instanceof Error ? error.message : String(error)}`,
              });
            }
          }

          logger.logPhase('cleanup', 'Pruning stale products');

          syncProgressStore.updateProvider(provider.name, {
            status: 'syncing',
            phase: 'cleanup',
            total: allProducts.length,
            synced: syncedCount,
            failed: failedCount,
          });

          const removedCount = yield* store.prune(provider.name, syncStartedAt);
          if (removedCount > 0) {
            logger.logPhase('cleanup', `Pruned ${removedCount} stale products`);
          }

          logger.complete();

          syncProgressStore.updateProvider(provider.name, {
            status: 'completed',
            phase: 'cleanup',
            total: allProducts.length,
            synced: syncedCount,
            failed: failedCount,
          });

          return { synced: syncedCount, removed: removedCount, failed: failedCount };
        }).pipe(
          Effect.catchAll((e) => {
            const errorMessage = e instanceof Error ? e.message : String(e);
            // Note: logger not available in catchAll, error was already logged in gen context
            console.error(`[ProductSync] Provider ${provider.name} failed:`, errorMessage);

            syncProgressStore.updateProvider(provider.name, {
              status: 'error',
              phase: 'fetch_products',
              total: 0,
              synced: 0,
              failed: 0,
              message: errorMessage,
            });

            return Effect.succeed({ 
              synced: 0, 
              removed: 0, 
              failed: 0, 
              error: errorMessage 
            });
          })
        );

      return {
        getProducts: (options) =>
          Effect.gen(function* () {
            const { productTypeSlug, collectionSlugs, tags, featured, limit = 50, offset = 0, includeUnlisted = false } = options;
            return yield* store.findMany({ productTypeSlug, collectionSlugs, tags, featured, limit, offset, includeUnlisted });
          }),

        getProduct: (identifier) =>
          Effect.gen(function* () {
            const product = yield* store.find(identifier);

            if (!product) {
              return yield* Effect.fail(new Error(`Product not found: ${identifier}`));
            }
            return { product };
          }),

        searchProducts: (options) =>
          Effect.gen(function* () {
            const { query, limit = 20 } = options;
            const products = yield* store.search(query, limit);
            return { products };
          }),

        getFeaturedProducts: (limit = 12) =>
          Effect.gen(function* () {
            const result = yield* store.findMany({ featured: true, limit, offset: 0, includeUnlisted: false });
            if (result.products.length === 0) {
              const fallback = yield* store.findMany({ limit, offset: 0, includeUnlisted: false });
              return { products: fallback.products };
            }
            return { products: result.products };
          }),

        getCollections: () =>
          Effect.gen(function* () {
            const collections = yield* collectionStore.findAll();
            return { collections };
          }),

        getCollection: (slug) =>
          Effect.gen(function* () {
            const collection = yield* collectionStore.find(slug);
            if (!collection) {
              return yield* Effect.fail(new Error(`Collection not found: ${slug}`));
            }
            
            const result = yield* store.findMany({ 
              collectionSlugs: [slug], 
              limit: 100, 
              offset: 0, 
              includeUnlisted: false 
            });
            
            return { collection, products: result.products };
          }),

        getCarouselCollections: () =>
          Effect.gen(function* () {
            const collections = yield* collectionStore.findCarouselCollections();
            return { collections };
          }),

        updateCollection: (slug, data) =>
          Effect.gen(function* () {
            const collection = yield* collectionStore.update(slug, data);
            return { collection };
          }),

        updateCollectionFeaturedProduct: (slug, productId) =>
          Effect.gen(function* () {
            const collection = yield* collectionStore.updateFeaturedProduct(slug, productId);
            return { collection };
          }),

        sync: () =>
          Effect.gen(function* () {
            const syncStartedAt = new Date();
            
            if (providers.length === 0) {
              console.log('[ProductSync] No providers configured, skipping sync');
              syncProgressStore.complete({ synced: 0, failed: 0, removed: 0 });
              yield* store.setSyncStatus('products', 'idle', new Date(), null, null, null, new Date());
              return {
                status: 'completed' as const,
                count: 0,
                removed: 0,
                failed: 0,
                syncStartedAt: undefined,
                syncDuration: 0,
              };
            }
            
            console.log('[ProductSync] Starting sync:', {
              syncStartedAt: syncStartedAt.toISOString(),
              providersCount: providers.length,
            });

            try {
              const results = yield* Effect.all(
                providers.map((p) => syncFromProvider(p, syncStartedAt)),
                { concurrency: 2 }
              );

              const totalSynced = results.reduce((sum, r) => sum + r.synced, 0);
              const totalRemoved = results.reduce((sum, r) => sum + r.removed, 0);
              const totalFailed = results.reduce((sum, r) => sum + (r.failed || 0), 0);
              const providerErrors = results.filter(r => r.error).map(r => r.error);
              const syncDuration = Math.floor((Date.now() - syncStartedAt.getTime()) / 1000);

              // All providers failed
              if (providerErrors.length === providers.length) {
                const allErrors = providerErrors.join('; ');
                console.error(`[ProductSync] All providers failed:`, allErrors);
                
                syncProgressStore.error(allErrors);
                
                yield* store.setSyncStatus(
                  'products',
                  'error',
                  null,
                  new Date(),
                  allErrors,
                  { providerErrors, syncDuration },
                  null
                );
                
                // Don't throw - let the fiber complete normally so cleanup happens
                return {
                  status: 'error' as const,
                  count: 0,
                  removed: 0,
                  failed: totalFailed,
                  syncStartedAt: syncStartedAt.toISOString(),
                  syncDuration,
                };
              }

              // Some providers succeeded (or partial success)
              if (providerErrors.length > 0) {
                console.warn(`[ProductSync] ${providerErrors.length} provider(s) failed, but sync completed with partial results`);
              }

              syncProgressStore.complete({ synced: totalSynced, failed: totalFailed, removed: totalRemoved });

              yield* store.setSyncStatus('products', 'idle', new Date(), null, null, null, new Date());
              console.log(`[ProductSync] Completed: ${totalSynced} synced, ${totalFailed} failed, ${totalRemoved} removed (${syncDuration}s)`);

              return { 
                status: 'completed' as const, 
                count: totalSynced, 
                removed: totalRemoved,
                failed: totalFailed,
                syncStartedAt: syncStartedAt.toISOString(),
                syncDuration,
              };
            } catch (error) {
              // Handle unexpected errors
              const errorMessage = error instanceof Error ? error.message : String(error);
              const syncDuration = Math.floor((Date.now() - syncStartedAt.getTime()) / 1000);
              
              console.error('[ProductSync] Unexpected error:', errorMessage);
              syncProgressStore.error(errorMessage);
              
              yield* store.setSyncStatus(
                'products',
                'error',
                null,
                new Date(),
                errorMessage,
                { errorType: 'UNEXPECTED_ERROR', syncDuration },
                null
              );
              
              // Return error state instead of throwing
              return {
                status: 'error' as const,
                count: 0,
                removed: 0,
                failed: 0,
                syncStartedAt: syncStartedAt.toISOString(),
                syncDuration,
              };
            }
          }),

        getSyncStatus: () =>
          Effect.gen(function* () {
            return yield* store.getSyncStatus('products');
          }),

        updateProductListing: (id, listed) =>
          Effect.gen(function* () {
            const product = yield* store.updateListing(id, listed);
            if (!product) {
              return { success: false };
            }
            return { success: true, product };
          }),

        updateProductTags: (id, tags) =>
          Effect.gen(function* () {
            const product = yield* store.updateTags(id, tags);
            if (!product) {
              return { success: false };
            }
            return { success: true, product };
          }),

        updateProductFeatured: (id, featured) =>
          Effect.gen(function* () {
            const product = yield* store.updateFeatured(id, featured);
            if (!product) {
              return { success: false };
            }
            return { success: true, product };
          }),

        updateProductCollections: (id, collectionSlugs) =>
          Effect.gen(function* () {
            yield* collectionStore.setProductCollections(id, collectionSlugs);
            const product = yield* store.find(id);
            if (!product) {
              return { success: false };
            }
            return { success: true, product };
          }),

        getCategories: () =>
          Effect.gen(function* () {
            const categories = yield* collectionStore.findAll();
            return { categories };
          }),

        createCategory: (data) =>
          Effect.gen(function* () {
            const category = yield* collectionStore.create(data);
            return { category };
          }),

        deleteCategory: (slug) =>
          Effect.gen(function* () {
            yield* collectionStore.delete(slug);
            return { success: true };
          }),
      };
    })
  );
