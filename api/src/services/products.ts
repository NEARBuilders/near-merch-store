import { Context, Effect, Layer } from 'every-plugin/effect';
import type { MarketplaceRuntime, FulfillmentProvider } from '../runtime';
import type { Collection, Product, ProductCategory, ProductImage, FulfillmentConfig } from '../schema';
import { ProductStore, type ProductWithImages, type ProductVariantInput } from '../store';
import type { ProviderProduct } from './fulfillment/schema';

export const COLLECTIONS: Collection[] = [
  {
    slug: 'men',
    name: 'Men',
    description: 'Premium fits designed specifically for men. Classic essentials to modern oversized styles.',
    image: '/ui/src/assets/images/pngs/men_collections.avif',
    features: [
      'Regular & Oversized Fits',
      'Premium 100% Cotton',
      'Modern Minimalist Designs',
      'Durable Construction',
    ],
  },
  {
    slug: 'women',
    name: 'Women',
    description: 'Tailored fits designed for women. Comfortable, stylish, and sustainably made.',
    image: '/ui/src/assets/images/pngs/women_collections.avif',
    features: [
      'Fitted & Crop Styles',
      'Premium Soft Fabrics',
      'Versatile Designs',
      'Sustainable Materials',
    ],
  },
  {
    slug: 'accessories',
    name: 'Accessories',
    description: 'Complete your look with our curated selection. From everyday essentials to statement pieces.',
    image: '/ui/src/assets/images/pngs/accessories.avif',
    badge: 'Limited',
    features: [
      'Functional & Stylish',
      'Premium Materials',
      'Versatile Designs',
      'Perfect for Gifting',
    ],
  },
  {
    slug: 'exclusives',
    name: 'Exclusives',
    description: "Limited edition designs created in collaboration with artists. Once they're gone, they're gone.",
    image: '/ui/src/assets/images/pngs/near_legion.avif',
    features: [
      'Limited Edition Items',
      'Artist Collaborations',
      'Unique Designs',
      'Collectible Pieces',
    ],
  },
];

function categoryFromSlug(slug: string): ProductCategory | undefined {
  // UI routes use collection slugs; API/storage uses ProductCategory.
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

function transformProviderProduct(
  providerName: string,
  product: ProviderProduct
): ProductWithImages {
  const images: ProductImage[] = [];
  const thumbnailUrl = product.thumbnailUrl;

  if (thumbnailUrl) {
    images.push({
      id: `catalog-${product.sourceId}`,
      url: thumbnailUrl,
      type: 'catalog',
      order: 0,
    });
  }

  const firstVariant = product.variants[0];
  const basePrice = product.variants.length > 0 
    ? Math.min(...product.variants.map(v => v.retailPrice))
    : 0;
  
  const baseCurrency = firstVariant?.currency || 'USD';

  const variants: ProductVariantInput[] = product.variants.map((variant) => {
    const fulfillmentConfig: FulfillmentConfig = {
      externalVariantId: variant.id,
      externalProductId: String(product.sourceId),
      designFileUrl: variant.files?.[0]?.url || null,
      providerData: providerName === 'printful' 
        ? { 
            syncVariantId: parseInt(variant.id), 
            catalogVariantId: variant.catalogVariantId,
            catalogProductId: variant.catalogProductId,
          }
        : providerName === 'gelato'
        ? { productUid: String(product.sourceId) }
        : {},
    };

    return {
      id: `${providerName}-variant-${variant.id}`,
      name: variant.name || 'One Size',
      sku: variant.sku,
      price: variant.retailPrice,
      currency: variant.currency,
      attributes: {
        size: variant.size || 'One Size',
        ...(variant.color && { color: variant.color }),
        ...(variant.colorCode && { colorCode: variant.colorCode }),
      },
      externalVariantId: variant.id,
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
    images,
    primaryImage: thumbnailUrl,
    variants,
    fulfillmentProvider: providerName,
    externalProductId: String(product.sourceId),
    source: providerName,
    mockupConfig: {
      styles: ['Lifestyle', 'Flat'],
      placements: ['front'],
      format: 'jpg',
      generateOnSync: true,
    },
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
        provider: FulfillmentProvider
      ): Effect.Effect<number, Error> =>
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

          console.log(`[ProductSync] Completed ${provider.name} sync: ${syncedCount} products`);
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
