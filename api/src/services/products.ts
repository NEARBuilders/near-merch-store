import { Context, Effect, Layer } from 'every-plugin/effect';
import type { FulfillmentProvider, MarketplaceRuntime } from '../runtime';
import type { Collection, FulfillmentConfig, Product, ProductCategory, ProductImage, ProductOption } from '../schema';
import { ProductStore, type ProductVariantInput, type ProductWithImages } from '../store';
import type { ProviderProduct } from './fulfillment/schema';

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
>() { }

function transformProviderProduct(
  providerName: string,
  product: ProviderProduct
): ProductWithImages {
  const firstVariantWithDesigns = product.variants.find(v => v.designFiles?.length);
  const designFiles = firstVariantWithDesigns?.designFiles || [];

  const imageMap = new Map<string, ProductImage>();
  const seenUrls = new Set<string>();
  const thumbnailUrl = product.thumbnailUrl;

  if (thumbnailUrl) {
    imageMap.set(thumbnailUrl, {
      id: `catalog-${product.sourceId}`,
      url: thumbnailUrl,
      type: 'catalog',
      order: 0,
      variantIds: [], // Thumbnail is not variant-specific
    });
    seenUrls.add(thumbnailUrl);
  }

  let imageOrder = 1;
  for (const variant of product.variants) {
    const variantId = `${providerName}-variant-${variant.id}`;

    if (!variant.files) continue;
    for (const file of variant.files) {
      const url = file.previewUrl || file.url;
      if (!url) continue;

      if (!imageMap.has(url)) {
        imageMap.set(url, {
          id: `file-${file.id}-${variant.id}`,
          url,
          type: file.type === 'preview' ? 'preview' : 'detail',
          placement: file.type !== 'preview' && file.type !== 'default' ? file.type : undefined,
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

  // Extract unique options from all variants
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

  const firstVariant = product.variants[0];
  const basePrice = product.variants.length > 0
    ? Math.min(...product.variants.map(v => v.retailPrice))
    : 0;

  const baseCurrency = firstVariant?.currency || 'USD';

  const variants: ProductVariantInput[] = product.variants.map((variant) => {
    const variantId = String(variant.id);

    const fulfillmentConfig: FulfillmentConfig = {
      externalVariantId: variantId,
      externalProductId: String(product.sourceId),
      providerData: providerName === 'printful'
        ? {
          catalogVariantId: variant.catalogVariantId,
          catalogProductId: variant.catalogProductId,
        }
        : providerName === 'gelato'
          ? { productUid: String(product.sourceId) }
          : {},
    };

    return {
      id: `${providerName}-variant-${variantId}`,
      name: variant.name || 'One Size',
      sku: variant.sku,
      price: variant.retailPrice,
      currency: variant.currency,
      attributes: [
        { name: 'Size', value: variant.size || 'One Size' },
        ...(variant.color ? [{ name: 'Color', value: variant.color }] : []),
      ],
      externalVariantId: variantId,
      fulfillmentConfig,
      inStock: true,
    };
  });

  return {
    id: `${providerName}-product-${product.sourceId}`,
    name: product.name,
    description: product.description || undefined,
    price: basePrice,
    currency: baseCurrency,
    category: 'Exclusives',
    options,
    images,
    thumbnailImage: thumbnailUrl,
    variants,
    designFiles,
    fulfillmentProvider: providerName,
    externalProductId: String(product.sourceId),
    source: providerName,
  };
}

export const ProductServiceLive = (runtime: MarketplaceRuntime) =>
  Layer.effect(
    ProductService,
    Effect.gen(function* () {
      const store = yield* ProductStore;
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
      ): Effect.Effect<{ synced: number; removed: number }, Error> =>
        Effect.gen(function* () {
          console.log(`[ProductSync] Starting sync from ${provider.name}...`);

          const { products } = yield* Effect.tryPromise({
            try: () => provider.client.getProducts({ limit: 100, offset: 0 }),
            catch: (e) => {
              const issues = extractValidationIssues(e);
              if (issues) {
                console.error(`[ProductSync] Validation error from ${provider.name}:`);
                console.error(issues);
                return new Error(`Validation failed for ${provider.name}:\n${issues}`);
              }

              const errorMessage = e instanceof Error ? e.message : String(e);
              return new Error(`Failed to fetch products from ${provider.name}: ${errorMessage}`);
            },
          });

          console.log(`[ProductSync] Found ${products.length} products from ${provider.name}`);

          let syncedCount = 0;

          for (const product of products) {
            try {
              const localProduct = transformProviderProduct(provider.name, product);



              yield* store.upsert(localProduct);
              syncedCount++;
              console.log(`[ProductSync] Synced product: ${localProduct.name} with ${localProduct.variants.length} variants`);
            } catch (error) {
              console.error(`[ProductSync] Failed to sync product ${product.id}:`, error);
            }
          }

          const removedCount = yield* store.prune(provider.name, syncStartedAt);
          if (removedCount > 0) {
            console.log(`[ProductSync] Pruned ${removedCount} stale products from ${provider.name}`);
          }

          console.log(`[ProductSync] Completed ${provider.name} sync: ${syncedCount} synced, ${removedCount} removed`);
          return { synced: syncedCount, removed: removedCount };
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

        getFeaturedProducts: (limit = 12) =>
          Effect.gen(function* () {
            const result = yield* store.findMany({ limit, offset: 0 });
            return { products: result.products };
          }),

        getCollections: () => Effect.succeed({ collections: [] }),

        getCollection: (slug) =>
          Effect.gen(function* () {
            return yield* Effect.fail(new Error(`Collection not found: ${slug}`));
          }),

        sync: () =>
          Effect.gen(function* () {
            if (providers.length === 0) {
              console.log('[ProductSync] No providers configured, skipping sync');
              return { status: 'completed', count: 0, removed: 0 };
            }

            const syncStartedAt = new Date();
            yield* store.setSyncStatus('products', 'running', null, null, null);

            try {
              const results = yield* Effect.all(
                providers.map((p) => syncFromProvider(p, syncStartedAt)),
                { concurrency: 'unbounded' }
              );

              const totalSynced = results.reduce((sum, r) => sum + r.synced, 0);
              const totalRemoved = results.reduce((sum, r) => sum + r.removed, 0);
              yield* store.setSyncStatus('products', 'idle', new Date(), null, null);
              console.log(`[ProductSync] Completed: ${totalSynced} synced, ${totalRemoved} removed`);
              return { status: 'completed', count: totalSynced, removed: totalRemoved };
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
