import { Context, Effect, Layer } from 'every-plugin/effect';
import type { MarketplaceRuntime } from '../runtime';
import type { FulfillmentConfig, Product, ProductImage } from '../schema';
import { ProductStore, type ProductVariantInput, type ProductWithImages } from '../store';
import type { FulfillmentFile } from './fulfillment/schema';
import { generateProductId, generatePublicKey, generateSlug } from '../utils/product-ids';

export interface BuildVariantInput {
  name: string;
  variantRef: string;
  providerConfig: Record<string, unknown>;
  attributes?: Array<{ name: string; value: string }>;
  price?: number;
  currency?: string;
  sku?: string;
}

export interface BuildProductInput {
  name: string;
  description?: string;
  providerName: string;
  image?: string;
  variants: BuildVariantInput[];
  files: FulfillmentFile[];
  assetId?: string;
  priceOverride?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
}

export class ProductBuilderService extends Context.Tag('ProductBuilderService')<
  ProductBuilderService,
  {
    readonly build: (input: BuildProductInput) => Effect.Effect<Product, Error>;
    readonly triggerMockups: (
      productId: string,
      styleIds?: number[],
    ) => Effect.Effect<Product, Error>;
  }
>() {}

export const ProductBuilderServiceLive = (runtime: MarketplaceRuntime) =>
  Layer.effect(
    ProductBuilderService,
    Effect.gen(function* () {
      const store = yield* ProductStore;

      const build = (input: BuildProductInput) =>
        Effect.gen(function* () {
          if (input.variants.length === 0) {
            return yield* Effect.fail(new Error('At least one variant is required'));
          }

          const basePrice = input.priceOverride ?? input.variants[0]!.price ?? 0;
          const baseCurrency = input.currency ?? input.variants[0]!.currency ?? 'USD';

          const optionsMap = new Map<string, Set<string>>();
          for (const variant of input.variants) {
            for (const attr of variant.attributes ?? []) {
              if (!optionsMap.has(attr.name)) optionsMap.set(attr.name, new Set());
              optionsMap.get(attr.name)!.add(attr.value);
            }
          }

          const options = Array.from(optionsMap.entries()).map(([name, values], index) => ({
            id: `option-${index}`,
            name,
            values: Array.from(values),
            position: index + 1,
          }));

          const images: ProductImage[] = [];
          if (input.image) {
            images.push({
              id: `product-image-0`,
              url: input.image,
              type: 'catalog',
              order: 0,
            });
          }

          const variants: ProductVariantInput[] = input.variants.map((v) => {
            const fulfillmentConfig: FulfillmentConfig = {
              providerName: input.providerName,
              providerConfig: v.providerConfig,
              files: input.files,
            };

            return {
              id: `${input.providerName}-variant-${v.variantRef}`,
              name: v.name,
              sku: v.sku,
              price: input.priceOverride ?? v.price ?? basePrice,
              currency: v.currency ?? baseCurrency,
              attributes: v.attributes ?? [],
              externalVariantId: v.variantRef,
              fulfillmentConfig,
              inStock: true,
            };
          });

          const id = generateProductId();
          const publicKey = generatePublicKey();
          const slug = generateSlug(input.name, publicKey);

          const productWithImages: ProductWithImages = {
            id,
            publicKey,
            slug,
            name: input.name,
            description: input.description,
            price: basePrice,
            currency: baseCurrency,
            productTypeSlug: undefined,
            tags: [],
            options,
            images,
            thumbnailImage: input.image,
            variants,
            designFiles: input.files,
            fulfillmentProvider: input.providerName,
            externalProductId: undefined,
            source: input.providerName,
            assetId: input.assetId,
            metadata: {
              fees: [],
              ...input.metadata,
            },
          };

          return yield* store.upsert(productWithImages);
        });

      const triggerMockups = (productId: string, styleIds?: number[]) =>
        Effect.gen(function* () {
          const product = yield* store.find(productId);
          if (!product) {
            return yield* Effect.fail(new Error(`Product not found: ${productId}`));
          }

          const provider = runtime.getProvider(product.fulfillmentProvider);
          if (!provider) {
            return yield* Effect.fail(new Error(`Provider not found: ${product.fulfillmentProvider}`));
          }

          const config = product.variants[0]?.fulfillmentConfig;
          if (!config) {
            return yield* Effect.fail(new Error('No fulfillment config on product variants'));
          }

          const variantRefs = product.variants
            .map((v) => v.externalVariantId || v.id)
            .filter(Boolean);

          const mockupResult = yield* Effect.tryPromise({
            try: () =>
              provider.client.generateMockups({
                providerConfig: config.providerConfig,
                files: config.files,
                variantRefs,
                mockupStyleIds: styleIds,
              }),
            catch: (e) =>
              new Error(
                `Mockup generation failed: ${e instanceof Error ? e.message : String(e)}`,
              ),
          });

          if (mockupResult.status === 'completed' && mockupResult.images.length > 0) {
            const existingImages = product.images || [];
            const mockupImages: ProductImage[] = mockupResult.images.map((img, index) => ({
              id: `mockup-${img.styleId || 'default'}-${index}`,
              url: img.imageUrl,
              type: 'mockup' as const,
              placement: img.slot,
              style: img.styleId,
              variantIds: [img.variantRef],
              order: existingImages.length + index + 1,
            }));

            const updatedProduct: ProductWithImages = {
              id: product.id,
              publicKey: product.slug ? '' : generatePublicKey(),
              slug: product.slug,
              name: product.title,
              description: product.description,
              price: product.price,
              currency: product.currency,
              productTypeSlug: product.productType?.slug,
              tags: product.tags,
              options: product.options || [],
              images: [...existingImages, ...mockupImages],
              thumbnailImage: product.thumbnailImage ?? mockupImages[0]?.url,
              variants: product.variants.map((v) => ({
                id: v.id,
                name: v.title,
                sku: v.sku,
                price: v.price,
                currency: v.currency,
                attributes: v.attributes,
                externalVariantId: v.externalVariantId,
                fulfillmentConfig: v.fulfillmentConfig,
                inStock: v.availableForSale,
              })),
              designFiles: product.designFiles || [],
              fulfillmentProvider: product.fulfillmentProvider,
              externalProductId: product.externalProductId,
              source: product.source || product.fulfillmentProvider,
              assetId: product.assetId,
              metadata: product.metadata,
            };

            return yield* store.upsert(updatedProduct);
          }

          const fresh = yield* store.find(productId);
          return fresh!;
        });

      return { build, triggerMockups };
    }),
  );
