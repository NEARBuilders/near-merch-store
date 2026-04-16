import { eq, isNotNull, sql } from 'drizzle-orm';
import { Context, Effect, Layer } from 'every-plugin/effect';
import * as schema from '../db/schema';
import { Database } from '../store/database';
import { AssetStore } from '../store/assets';
import { ProductStore } from '../store/products';
import { isOldFormat, migrateVariantConfig, extractAssetUrls, type MigrationResult } from './migrate';
import type { MarketplaceRuntime } from '../runtime';
import type { LuluBookConfig } from './fulfillment/lulu/types';
import { generateProductId, generatePublicKey, generateSlug } from '../utils/product-ids';

export class MigrationService extends Context.Tag('MigrationService')<
  MigrationService,
  {
    readonly runMigration: () => Effect.Effect<MigrationResult, Error>;
  }
>() {}

export const MigrationServiceLive = (runtime: MarketplaceRuntime) =>
  Layer.effect(
    MigrationService,
    Effect.gen(function* () {
      const db = yield* Database;
      const assetStore = yield* AssetStore;
      const productStore = yield* ProductStore;

      const runMigration = () =>
        Effect.gen(function* () {
          const result: MigrationResult = {
            variantsMigrated: 0,
            variantsSkipped: 0,
            assetsCreated: 0,
            luluBooksSeeded: 0,
            errors: [],
          };

          const allProducts = yield* Effect.tryPromise({
            try: async () => {
              return await db
                .select({
                  id: schema.products.id,
                  fulfillmentProvider: schema.products.fulfillmentProvider,
                  name: schema.products.name,
                  assetId: schema.products.assetId,
                })
                .from(schema.products);
            },
            catch: (e) => new Error(`Failed to fetch products: ${e instanceof Error ? e.message : String(e)}`),
          });

          const productProviderMap = new Map<string, string>();
          for (const p of allProducts) {
            productProviderMap.set(p.id, p.fulfillmentProvider);
          }

          const allVariants = yield* Effect.tryPromise({
            try: async () => {
              return await db
                .select({
                  id: schema.productVariants.id,
                  productId: schema.productVariants.productId,
                  fulfillmentConfig: schema.productVariants.fulfillmentConfig,
                })
                .from(schema.productVariants)
                .where(isNotNull(schema.productVariants.fulfillmentConfig));
            },
            catch: (e) => new Error(`Failed to fetch variants: ${e instanceof Error ? e.message : String(e)}`),
          });

          const allVariantConfigs = allVariants.map((v) => ({
            fulfillmentConfig: v.fulfillmentConfig,
          }));
          const assetUrls = extractAssetUrls(allVariantConfigs);

          for (const [url, info] of assetUrls) {
            try {
              yield* assetStore.create({
                id: generateProductId(),
                url,
                type: info.type,
                name: undefined,
              });
              result.assetsCreated++;
            } catch {
              // Already exists — skip
            }
          }

          for (const variant of allVariants) {
            try {
              const config = variant.fulfillmentConfig;
              if (!config || isOldFormat(config) === false) {
                result.variantsSkipped++;
                continue;
              }

              const providerName = productProviderMap.get(variant.productId);
              if (!providerName) {
                result.errors.push({
                  variantId: variant.id,
                  error: `Unknown provider for product ${variant.productId}`,
                });
                result.variantsSkipped++;
                continue;
              }

              const newConfig = migrateVariantConfig(config, providerName);

              yield* Effect.tryPromise({
                try: async () => {
                  await db
                    .update(schema.productVariants)
                    .set({ fulfillmentConfig: newConfig as any })
                    .where(eq(schema.productVariants.id, variant.id));
                },
                catch: (e) => new Error(`Failed to update variant: ${e instanceof Error ? e.message : String(e)}`),
              });

              result.variantsMigrated++;
            } catch (e) {
              result.errors.push({
                variantId: variant.id,
                error: e instanceof Error ? e.message : String(e),
              });
              result.variantsSkipped++;
            }
          }

          for (const book of runtime.luluBooks) {
            try {
              const existing = yield* productStore.find(book.id);
              if (existing) {
                continue;
              }

              const id = generateProductId();
              const publicKey = generatePublicKey();
              const slug = generateSlug(book.title, publicKey);

              const providerConfig: Record<string, unknown> = {
                podPackageId: book.podPackageId,
                pageCount: book.pageCount,
                sku: book.sku,
                coverPdfUrl: book.coverPdfUrl,
                interiorPdfUrl: book.interiorPdfUrl,
              };

              yield* productStore.upsert({
                id,
                publicKey,
                slug,
                name: book.title,
                description: book.description,
                price: book.retailPrice,
                currency: book.currency,
                productTypeSlug: undefined,
                tags: [],
                options: [],
                images: [],
                thumbnailImage: book.thumbnailUrl ?? undefined,
                variants: [{
                  id: `lulu-variant-${id}`,
                  name: book.variantName || 'Paperback',
                  sku: book.sku,
                  price: book.retailPrice,
                  currency: book.currency,
                  attributes: [],
                  externalVariantId: id,
                  fulfillmentConfig: {
                    providerName: 'lulu',
                    providerConfig,
                    files: [
                      { assetId: `lulu-${book.id}-cover`, url: book.coverPdfUrl, slot: 'cover' },
                      { assetId: `lulu-${book.id}-interior`, url: book.interiorPdfUrl, slot: 'interior' },
                    ],
                  },
                  inStock: true,
                }],
                designFiles: [],
                fulfillmentProvider: 'lulu',
                externalProductId: book.id,
                source: 'lulu',
                assetId: undefined,
                metadata: {
                  fees: [],
                  ...(book.downloadUrl ? {
                    downloads: [{
                      url: book.downloadUrl,
                      label: book.downloadLabel || 'Download for Free',
                      kind: 'free' as const,
                    }],
                  } : {}),
                },
              });

              result.luluBooksSeeded++;
            } catch (e) {
              result.errors.push({
                productId: book.id,
                error: `Failed to seed Lulu book: ${e instanceof Error ? e.message : String(e)}`,
              });
            }
          }

          return result;
        });

      return { runMigration };
    }),
  );
