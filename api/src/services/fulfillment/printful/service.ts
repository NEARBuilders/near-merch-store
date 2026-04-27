import crypto from 'crypto';
import { Effect, Schedule } from 'every-plugin/effect';
import {
  MockupGeneratorTask,
  MockupTaskCreation,
  TechniqueEnum,
  type Address,
  type MockupStyles,
  type Shipment,
  type Variant
} from 'printful-sdk-js-v2';
import type { PrintfulWebhookEventType, ProductImage } from '../../../schema';
import { FulfillmentError } from '../errors';
import type {
  BrowseCatalogOutput,
  CatalogProductDetailOutput,
  CatalogVariantsOutput,
  CreateOrderInput,
  FulfillmentFile,
  FulfillmentOrder,
  FulfillmentOrderStatus,
  GenerateMockupsInput,
  GenerateMockupsOutput,
  GetMockupResultOutput,
  MockupImage,
  OrderResult,
  PingOutput,
  ProviderCatalogProduct,
  ProviderCatalogVariant,
  ProviderCatalogPrice,
  GetPlacementsOutput,
  ShippingQuoteInput,
  ShippingQuoteOutput,
  TaxQuoteInput,
  TaxQuoteOutput,
  VariantPriceOutput,
} from '../schema';
import { PrintfulClient, type PrintfulSyncProduct, type PrintfulSyncVariant } from './client';
import type { MockupStyleInfo } from './types';
import type { ProductWithImages, ProductVariantInput, Product, FulfillmentConfig } from '../../../schema';
import type { SyncProgressEvent } from '../schema';
import { generateProductId, generatePublicKey, generateSlug } from '../../../utils/product-ids';

export type { SyncProgressEvent };

export class PrintfulService {
  private client: PrintfulClient;
  private apiKey: string;
  private storeId: string;

  constructor(apiKey: string, storeId: string, baseUrl = 'https://api.printful.com') {
    this.client = new PrintfulClient(apiKey, storeId, baseUrl);
    this.apiKey = apiKey;
    this.storeId = storeId;
  }

  // ─── Provider Health ───

  ping(): Effect.Effect<PingOutput, FulfillmentError> {
    return Effect.tryPromise({
      try: async () => {
        const response = await this.client.storesV2.getStores();
        if (!response) throw new Error('No stores returned');
        return {
          provider: 'printful',
          status: 'ok' as const,
          timestamp: new Date().toISOString(),
        };
      },
      catch: (e) => new FulfillmentError({
        message: `Printful connection test failed: ${e instanceof Error ? e.message : String(e)}`,
        code: 'SERVICE_UNAVAILABLE',
        provider: 'printful',
        cause: e,
      }),
    });
  }

  // ─── Catalog ───

  private normalizeVariant(variant: Variant): ProviderCatalogVariant {
    return {
      id: `printful-${variant.id}`,
      name: variant.name || '',
      size: variant.size || null,
      color: variant.color || null,
      colorCode: variant.color_code || null,
      image: variant.image || null,
      providerRef: String(variant.id),
    };
  }

  private normalizeProduct(product: {
    id: number;
    name: string;
    brand?: string;
    model?: string;
    description?: string;
    image?: string;
    techniques?: string[];
    placements?: string[];
    variants_count?: number;
  }): ProviderCatalogProduct {
    return {
      id: `printful-${product.id}`,
      name: product.name,
      brand: product.brand ?? null,
      model: product.model ?? null,
      description: null,
      image: product.image ?? null,
      providerName: 'printful',
    };
  }

  browseCatalog(input: { limit?: number; offset?: number }): Effect.Effect<BrowseCatalogOutput, FulfillmentError> {
    return Effect.tryPromise({
      try: async () => {
        const result = await this.client.browseCatalog(input.limit || 50, input.offset || 0);
        return {
          products: result.products.map(p => this.normalizeProduct(p)),
          total: result.total,
        };
      },
      catch: (e) => new FulfillmentError({
        message: `Failed to browse Printful catalog: ${e instanceof Error ? e.message : String(e)}`,
        code: 'UNKNOWN',
        provider: 'printful',
        cause: e,
      }),
    });
  }

  getCatalogProduct(input: { id: string }): Effect.Effect<CatalogProductDetailOutput, FulfillmentError> {
    return Effect.tryPromise({
      try: async () => {
        const providerRef = input.id.replace('printful-', '');
        const product = await this.client.getCatalogProduct(parseInt(providerRef, 10));
        if (!product) throw new FulfillmentError({
          message: `Catalog product ${input.id} not found`,
          code: 'NOT_FOUND',
          provider: 'printful',
        });
        return {
          product: {
            id: `printful-${product.id}`,
            name: product.name,
            brand: product.brand ?? null,
            model: product.model ?? null,
            description: product.description ?? null,
            image: product.image ?? null,
            providerRef: String(product.id),
            providerName: 'printful',
            techniques: product.techniques,
            placements: product.placements,
          },
        };
      },
      catch: (e) => {
        if (e instanceof FulfillmentError) return e;
        return new FulfillmentError({
          message: `Failed to get Printful catalog product: ${e instanceof Error ? e.message : String(e)}`,
          code: 'UNKNOWN',
          provider: 'printful',
          cause: e,
        });
      },
    });
  }

  getCatalogProductVariants(input: { id: string }): Effect.Effect<CatalogVariantsOutput, FulfillmentError> {
    return Effect.tryPromise({
      try: async () => {
        const providerRef = input.id.replace('printful-', '');
        const variants = await this.client.getCatalogProductVariants(parseInt(providerRef, 10));
        return {
          variants: variants.map(v => this.normalizeVariant(v)),
        };
      },
      catch: (e) => new FulfillmentError({
        message: `Failed to get Printful catalog variants: ${e instanceof Error ? e.message : String(e)}`,
        code: 'UNKNOWN',
        provider: 'printful',
        cause: e,
      }),
    });
  }

  getVariantPrice(input: { id: string }): Effect.Effect<VariantPriceOutput, FulfillmentError> {
    return Effect.tryPromise({
      try: async () => {
        const providerRef = input.id.replace('printful-', '');
        const price = await this.client.getVariantPrice(parseInt(providerRef, 10));
        return {
          price: price ? { wholesale: price.wholesale, retail: price.retail, currency: price.currency } : null,
        };
      },
      catch: (e) => new FulfillmentError({
        message: `Failed to get Printful variant price: ${e instanceof Error ? e.message : String(e)}`,
        code: 'UNKNOWN',
        provider: 'printful',
        cause: e,
      }),
    });
  }

  getPlacements(input: { providerConfig: Record<string, unknown> }): Effect.Effect<GetPlacementsOutput, FulfillmentError> {
    const config = input.providerConfig as { catalogProductId?: string | number };
    const productId = config.catalogProductId
      ? parseInt(String(config.catalogProductId).replace('printful-', ''), 10)
      : 0;

    if (!productId) {
      return Effect.succeed({ placements: [] });
    }

    const knownPlacements: Record<string, { label?: string; required?: boolean; acceptedFormats?: string[] }> = {
      front: { label: 'Front', acceptedFormats: ['png', 'jpg', 'svg'] },
      back: { label: 'Back', acceptedFormats: ['png', 'jpg', 'svg'] },
      left: { label: 'Left', acceptedFormats: ['png', 'jpg', 'svg'] },
      right: { label: 'Right', acceptedFormats: ['png', 'jpg', 'svg'] },
      front_large: { label: 'Front (Large)', acceptedFormats: ['png', 'jpg', 'svg'] },
      back_large: { label: 'Back (Large)', acceptedFormats: ['png', 'jpg', 'svg'] },
      label_outside: { label: 'Label (Outside)', acceptedFormats: ['png', 'jpg', 'svg'] },
      sleeve_left: { label: 'Left Sleeve', acceptedFormats: ['png', 'jpg', 'svg'] },
      sleeve_right: { label: 'Right Sleeve', acceptedFormats: ['png', 'jpg', 'svg'] },
      embroidery_front: { label: 'Embroidery (Front)', acceptedFormats: ['png', 'jpg'] },
      embroidery_back: { label: 'Embroidery (Back)', acceptedFormats: ['png', 'jpg'] },
    };

    return Effect.gen(this, function* () {
      const productResult = yield* this.getCatalogProduct({ id: `printful-${productId}` });
      const product = productResult.product as any;
      const placements: string[] = product.placements || [];

      return {
        placements: placements.map((name: string) => ({
          name,
          label: knownPlacements[name]?.label,
          required: false,
          acceptedFormats: knownPlacements[name]?.acceptedFormats,
        })),
      };
    });
  }

  // ─── Mockups ───

  generateMockups(input: GenerateMockupsInput): Effect.Effect<GenerateMockupsOutput, FulfillmentError> {
    return Effect.gen(this, function* () {
      const config = input.providerConfig as { catalogProductId?: number };
      const productId = config.catalogProductId || 0;
      const variantIds = (input.variantRefs || [])
        .map(ref => parseInt(ref.replace('printful-', ''), 10))
        .filter(id => !isNaN(id));

      if (variantIds.length === 0) {
        return { status: 'unsupported', images: [] };
      }

      const placements = input.files.map((f: any) => ({
        placement: f.slot,
        technique: (f.metadata?.technique as any) || TechniqueEnum.DTG,
        layers: [{ type: 'file' as const, url: f.url }],
      }));

      const payload = {
        format: input.format === 'png' ? MockupTaskCreation.format.PNG : MockupTaskCreation.format.JPG,
        products: [{
          source: 'catalog' as const,
          mockup_style_ids: input.mockupStyleIds || [],
          catalog_product_id: productId,
          catalog_variant_ids: variantIds,
          placements,
        }],
      };

      const response = yield* Effect.tryPromise({
        try: async () => {
          const result = await this.client.mockupGeneratorV2.createMockupGeneratorTasks(this.storeId, payload);
          const tasks = (result?.data ?? []) as Array<{ id?: number }>;
          return String(tasks[0]?.id || '');
        },
        catch: (e) => new FulfillmentError({
          message: `Failed to generate mockups: ${e instanceof Error ? e.message : String(e)}`,
          code: 'UNKNOWN',
          provider: 'printful',
          cause: e,
        }),
      });

      const taskId = response;

      // Poll internally for up to 60 seconds
      const startTime = Date.now();
      const maxWaitMs = 60000;
      while (Date.now() - startTime < maxWaitMs) {
        const result = yield* this.getMockupResult(taskId);
        if (result.status === 'completed') {
          return { status: 'completed', images: result.images };
        }
        if (result.status === 'failed') {
          return { status: 'unsupported', images: [] };
        }
        yield* Effect.sleep('2000 millis');
      }

      return { status: 'pending', images: [], taskId };
    });
  }

  getMockupResult(taskId: string): Effect.Effect<GetMockupResultOutput, FulfillmentError> {
    return Effect.tryPromise({
      try: async () => {
        const response = await this.client.mockupGeneratorV2.getMockupGeneratorTasks([taskId]);
        const tasks = (response?.data ?? []) as MockupGeneratorTask[];
        const task = tasks[0];
        if (!task) return { status: 'failed' as const, images: [], error: 'Task not found' };

        if (task.status === MockupGeneratorTask.status.COMPLETED) {
          const images: MockupImage[] = [];
          for (const variantMockup of task.catalog_variant_mockups) {
            for (const mockup of variantMockup.mockups) {
              images.push({
                variantRef: `printful-${variantMockup.catalog_variant_id}`,
                slot: mockup.placement,
                imageUrl: mockup.mockup_url,
                styleId: String(mockup.style_id),
              });
            }
          }
          return { status: 'completed' as const, images };
        }

        if (task.status === MockupGeneratorTask.status.FAILED) {
          return { status: 'failed' as const, images: [], error: task.failure_reasons.map(e => e.detail).join(', ') };
        }

        return { status: 'pending' as const, images: [] };
      },
      catch: (e) => new FulfillmentError({
        message: `Failed to get mockup result: ${e instanceof Error ? e.message : String(e)}`,
        code: 'UNKNOWN',
        provider: 'printful',
        cause: e,
      }),
    });
  }

  getMockupStyles(productId: number): Effect.Effect<{ styles: MockupStyleInfo[] }, Error> {
    return Effect.tryPromise({
      try: async () => {
        const response = await this.client.catalogV2.retrieveMockupStylesByProductId(productId);
        const placements = (response?.data ?? []) as MockupStyles[];
        const styles: MockupStyleInfo[] = [];
        for (const placementStyle of placements) {
          for (const mockupStyle of placementStyle.mockup_styles ?? []) {
            styles.push({
              id: String(mockupStyle.id ?? 0),
              name: `${mockupStyle.category_name} - ${mockupStyle.view_name}`,
              category: mockupStyle.category_name,
              placement: placementStyle.placement,
              technique: placementStyle.technique,
              viewName: mockupStyle.view_name,
            });
          }
        }
        return { styles };
      },
      catch: (e) => new Error(`Failed to get mockup styles: ${e instanceof Error ? e.message : String(e)}`),
    });
  }

  // ─── Orders ───

  createOrder(input: CreateOrderInput): Effect.Effect<OrderResult, FulfillmentError> {
    return Effect.tryPromise({
      try: async () => {
        const recipient: Address = {
          name: input.recipient.name,
          company: input.recipient.company,
          address1: input.recipient.address1,
          address2: input.recipient.address2,
          city: input.recipient.city,
          state_code: input.recipient.stateCode,
          country_code: input.recipient.countryCode,
          zip: input.recipient.zip,
          phone: input.recipient.phone,
          email: input.recipient.email,
          tax_number: input.recipient.taxId,
        };

        const orderItems = input.items.map(item => {
          const config = item.providerConfig as {
            catalogVariantId?: number;
            catalogProductId?: number;
          };
          const catalogVariantId = config?.catalogVariantId;
          if (!catalogVariantId) {
            throw new FulfillmentError({
              message: 'Missing catalogVariantId in providerConfig',
              code: 'INVALID_REQUEST',
              provider: 'printful',
            });
          }

          const placements = (item.files || []).map((df: any) => ({
            placement: df.slot,
            technique: (df.metadata?.technique as any) || 'dtg',
            layers: [{ type: 'file' as const, url: df.url }],
          }));

          return {
            source: 'catalog' as const,
            catalog_variant_id: catalogVariantId,
            quantity: item.quantity,
            placements,
          };
        });

        const result = await this.client.createOrder({
          external_id: input.externalId,
          recipient,
          order_items: orderItems as any,
        });

        return { id: String(result.id), status: result.status };
      },
      catch: (e) => {
        if (e instanceof FulfillmentError) return e;
        return new FulfillmentError({
          message: `Printful order failed: ${e instanceof Error ? e.message : String(e)}`,
          code: 'UNKNOWN',
          provider: 'printful',
          cause: e,
        });
      },
    });
  }

  getOrder(input: { id: string }): Effect.Effect<{ order: FulfillmentOrder }, FulfillmentError> {
    return Effect.tryPromise({
      try: async () => {
        const data = await this.client.getOrder(input.id);
        const order: FulfillmentOrder = {
          id: String(data.id),
          externalId: data.external_id ?? undefined,
          status: data.status as FulfillmentOrderStatus,
          created: new Date(data.created_at).getTime(),
          updated: new Date(data.updated_at).getTime(),
          recipient: {
            name: data.recipient.name,
            address1: data.recipient.address1,
            city: data.recipient.city,
            stateCode: data.recipient.state_code,
            countryCode: data.recipient.country_code,
            zip: data.recipient.zip,
            email: data.recipient.email,
          },
          shipments: undefined,
        };
        return { order };
      },
      catch: (e) => new FulfillmentError({
        message: `Failed to get Printful order: ${e instanceof Error ? e.message : String(e)}`,
        code: 'UNKNOWN',
        provider: 'printful',
        cause: e,
      }),
    });
  }

  confirmOrder(input: { id: string }): Effect.Effect<OrderResult, FulfillmentError> {
    return Effect.gen(this, function* () {
      yield* Effect.tryPromise({
        try: () => this.client.confirmOrder(input.id),
        catch: (e) => new FulfillmentError({
          message: `Failed to confirm Printful order: ${e instanceof Error ? e.message : String(e)}`,
          code: 'UNKNOWN',
          provider: 'printful',
          cause: e,
        }),
      });

      const { order } = yield* this.getOrder(input);
      return { id: input.id, status: order.status };
    });
  }

  cancelOrder(input: { id: string }): Effect.Effect<OrderResult, FulfillmentError> {
    return Effect.gen(this, function* () {
      yield* Effect.tryPromise({
        try: () => this.client.deleteOrder(input.id),
        catch: (e) => new FulfillmentError({
          message: `Failed to cancel Printful order: ${e instanceof Error ? e.message : String(e)}`,
          code: 'ORDER_NOT_CANCELLABLE',
          provider: 'printful',
          cause: e,
        }),
      });
      return { id: input.id, status: 'cancelled' };
    });
  }

  // ─── Shipping & Tax ───

  quoteShipping(input: ShippingQuoteInput): Effect.Effect<ShippingQuoteOutput, FulfillmentError> {
    return Effect.gen(this, function* () {
      const items = input.items
        .map(item => {
          const config = item.providerConfig as { catalogVariantId?: number };
          if (!config?.catalogVariantId) return null;
          return { catalog_variant_id: config.catalogVariantId, quantity: item.quantity };
        })
        .filter(Boolean) as Array<{ catalog_variant_id: number; quantity: number }>;

      if (items.length === 0) {
        return { rates: [], currency: input.currency || 'USD' };
      }

      const result = yield* Effect.tryPromise({
        try: () => this.client.calculateShippingRates({
          recipient: {
            country_code: input.recipient.countryCode,
            state_code: input.recipient.stateCode || undefined,
            city: input.recipient.city,
            zip: input.recipient.zip,
          },
          items,
          currency: input.currency,
        }),
        catch: (e) => new FulfillmentError({
          message: `Failed to calculate shipping rates: ${e instanceof Error ? e.message : String(e)}`,
          code: 'UNKNOWN',
          provider: 'printful',
          cause: e,
        }),
      });

      return {
        rates: (result || []).map(rate => ({
          id: rate.shipping,
          name: rate.shipping_method_name,
          rate: parseFloat(rate.rate),
          currency: rate.currency,
          minDeliveryDays: rate.min_delivery_days,
          maxDeliveryDays: rate.max_delivery_days,
          minDeliveryDate: rate.min_delivery_date,
          maxDeliveryDate: rate.max_delivery_date,
        })),
        currency: input.currency || 'USD',
      };
    });
  }

  calculateTax(input: TaxQuoteInput): Effect.Effect<TaxQuoteOutput, FulfillmentError> {
    const isQuoteMode = input.mode !== 'checkout';
    const startedAt = Date.now();

    return Effect.gen(this, function* () {
      const items = input.items
        .map(item => {
          const config = item.providerConfig as { catalogVariantId?: number };
          if (!config?.catalogVariantId) return null;
          return {
            catalogVariantId: config.catalogVariantId,
            quantity: item.quantity,
            designFiles: item.files,
          };
        })
        .filter(Boolean) as Array<{
          catalogVariantId: number;
          quantity: number;
          designFiles?: FulfillmentFile[];
        }>;

      if (items.length === 0) {
        return { required: false, rate: 0, shippingTaxable: false, exempt: true, taxAmount: 0, vat: 0 };
      }

      try {
        const result = yield* Effect.tryPromise({
          try: () => this.client.estimateOrder({
            recipient: {
              country_code: input.recipient.countryCode,
              zip: input.recipient.zip,
              state_code: input.recipient.stateCode || undefined,
            },
            items: items.map(item => ({
              catalog_variant_id: item.catalogVariantId,
              quantity: item.quantity,
              designFiles: item.designFiles?.map((df: any) => ({ placement: df.slot, url: df.url })),
            })),
            currency: input.currency || 'USD',
            ...(isQuoteMode ? { timeoutMs: 5000, requestTimeoutMs: 5000, retries: 0 } : {}),
          }),
          catch: (e) => {
            if (e instanceof FulfillmentError) return e;
            return new FulfillmentError({
              message: `Tax calculation failed: ${e instanceof Error ? e.message : String(e)}`,
              code: 'UNKNOWN',
              provider: 'printful',
              cause: e,
            });
          },
        });

        console.log(`[printful] Tax calculation (${input.mode ?? 'quote'}) completed in ${Date.now() - startedAt}ms`);

        const hasTax = result.tax > 0 || result.vat > 0;
        return {
          required: hasTax,
          rate: result.subtotal > 0 ? result.tax / result.subtotal : 0,
          shippingTaxable: true,
          exempt: !hasTax,
          taxAmount: result.tax,
          vat: result.vat,
        };
      } catch (error) {
        if (isQuoteMode) {
          console.warn(`[printful] Tax calculation skipped during quote after ${Date.now() - startedAt}ms: ${error instanceof Error ? error.message : String(error)}`);
          return { required: false, rate: 0, shippingTaxable: false, exempt: true, taxAmount: 0, vat: 0 };
        }
        throw error;
      }
    });
  }

  // ─── Sync Products ───

  async *syncProducts(
    upsertProduct: (product: ProductWithImages, syncedAt?: Date) => Promise<Product>,
    signal?: AbortSignal
  ): AsyncGenerator<SyncProgressEvent> {
    const THROW_IF_ABORTED = () => {
      if (signal?.aborted) throw new DOMException('Sync aborted', 'AbortError');
    };

    yield {
      status: 'syncing',
      phase: 'listing',
      totalSynced: 0,
      totalFailed: 0,
      timestamp: Date.now(),
      message: 'Fetching product list from Printful...',
    };

    let allSyncProducts: PrintfulSyncProduct[] = [];
    const PAGE_SIZE = 100;
    let offset = 0;

    try {
      while (true) {
        THROW_IF_ABORTED();
        const result = await this.client.getSyncProducts(PAGE_SIZE, offset);
        allSyncProducts = [...allSyncProducts, ...result.sync_products];
        const totalProducts = result.paging.total;

        if (allSyncProducts.length >= totalProducts) break;
        offset += PAGE_SIZE;
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      yield {
        status: 'error',
        phase: 'error',
        totalSynced: 0,
        totalFailed: 0,
        timestamp: Date.now(),
        message: `Failed to list products: ${error instanceof Error ? error.message : String(error)}`,
      };
      return;
    }

    const total = allSyncProducts.length;

    yield {
      status: 'syncing',
      phase: 'fetching',
      totalSynced: 0,
      totalFailed: 0,
      timestamp: Date.now(),
      message: `Found ${total} products. Fetching details...`,
      total,
    };

    let synced = 0;
    let failed = 0;

    for (const syncProduct of allSyncProducts) {
      THROW_IF_ABORTED();

      try {
        const detail = await this.client.getSyncProduct(syncProduct.id);
        const { sync_product, sync_variants } = detail;

        const variantIds = sync_variants.map(v => v.variant_id).filter(Boolean);
        const catalogVariants = await this.client.getCatalogVariantsBatch(variantIds);

        const catalogProductId = sync_variants[0]?.product?.product_id;
        let catalogProduct: Awaited<ReturnType<typeof this.client.getCatalogProduct>> = null;
        if (catalogProductId) {
          catalogProduct = await this.client.getCatalogProduct(catalogProductId);
        }

        yield {
          status: 'syncing',
          phase: 'saving',
          totalSynced: synced,
          totalFailed: failed,
          timestamp: Date.now(),
          currentProductName: sync_product.name,
          total,
        };

        const productWithImages = this.transformSyncProductToV2(
          sync_product,
          sync_variants,
          catalogVariants,
          catalogProduct
        );

        await upsertProduct(productWithImages, new Date());

        synced++;

        yield {
          status: 'syncing',
          phase: 'saving',
          totalSynced: synced,
          totalFailed: failed,
          timestamp: Date.now(),
          currentProductName: sync_product.name,
          message: `Synced ${synced}/${total}`,
          total,
        };

        await new Promise(r => setTimeout(r, 200));
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        failed++;
        console.error(`[PrintfulService] Failed to sync product ${syncProduct.name}:`, error);
        yield {
          status: 'syncing',
          phase: 'saving',
          totalSynced: synced,
          totalFailed: failed,
          timestamp: Date.now(),
          currentProductName: syncProduct.name,
          message: `Failed: ${error instanceof Error ? error.message : String(error)}`,
          total,
        };
      }
    }

    yield {
      status: 'completed',
      phase: 'complete',
      totalSynced: synced,
      totalFailed: failed,
      timestamp: Date.now(),
      message: `Sync complete: ${synced} synced, ${failed} failed`,
      total,
    };
  }

  private extractDesignFiles(files: Array<{ id: number; type: string; url: string; preview_url?: string | null }>): FulfillmentFile[] {
    return files
      .filter(f => f.url)
      .map(f => ({
        assetId: String(f.id),
        url: f.url,
        slot: f.type?.replace(/_/g, '-').replace('default', 'front') || 'front',
        metadata: f.preview_url ? { previewUrl: f.preview_url } : undefined,
      }));
  }

  private transformSyncProductToV2(
    syncProduct: PrintfulSyncProduct,
    syncVariants: PrintfulSyncVariant[],
    catalogVariants: Map<number, Variant>,
    catalogProduct: {
      id: number;
      name: string;
      brand?: string;
      model?: string;
      description?: string;
      image?: string;
      techniques?: string[];
      placements?: string[];
    } | null
  ): ProductWithImages {
    const optionsMap = new Map<string, Set<string>>();
    const variants: ProductVariantInput[] = syncVariants.map(v => {
      const catalogVariant = catalogVariants.get(v.variant_id);

      if (catalogVariant?.size) {
        if (!optionsMap.has('Size')) optionsMap.set('Size', new Set());
        optionsMap.get('Size')!.add(catalogVariant.size);
      }
      if (catalogVariant?.color) {
        if (!optionsMap.has('Color')) optionsMap.set('Color', new Set());
        optionsMap.get('Color')!.add(catalogVariant.color);
      }

      const designFiles = this.extractDesignFiles(v.files);

      const fulfillmentConfig: FulfillmentConfig = {
        providerName: 'printful',
        providerConfig: {
          catalogVariantId: v.variant_id,
          catalogProductId: v.product.product_id,
        },
        files: designFiles,
      };

      const attributes: Array<{ name: string; value: string }> = [];
      if (catalogVariant?.size) attributes.push({ name: 'Size', value: catalogVariant.size });
      if (catalogVariant?.color) attributes.push({ name: 'Color', value: catalogVariant.color });

      return {
        id: `printful-variant-${v.variant_id}`,
        name: v.name || syncProduct.name,
        sku: v.external_id,
        price: v.retail_price ? parseFloat(v.retail_price) : 0,
        currency: v.currency || 'USD',
        attributes,
        externalVariantId: String(v.variant_id),
        fulfillmentConfig,
        inStock: v.synced,
      };
    });

    const options = Array.from(optionsMap.entries()).map(([name, values], index) => ({
      id: `option-${index}`,
      name,
      values: Array.from(values),
      position: index + 1,
    }));

    const images: import('../../../schema').ProductImage[] = [];
    if (syncProduct.thumbnail_url) {
      images.push({
        id: `product-image-0`,
        url: syncProduct.thumbnail_url,
        type: 'catalog',
        order: 0,
      });
    }

    const providerDetails: Record<string, unknown> = {};
    if (catalogProduct) {
      if (catalogProduct.brand) providerDetails.brand = catalogProduct.brand;
      if (catalogProduct.model) providerDetails.model = catalogProduct.model;
      if (catalogProduct.description) providerDetails.description = catalogProduct.description;
      if (catalogProduct.techniques) providerDetails.techniques = catalogProduct.techniques;
      if (catalogProduct.placements) providerDetails.placements = catalogProduct.placements;
    }

    const basePrice = syncVariants[0]?.retail_price ? parseFloat(syncVariants[0].retail_price) : 0;
    const baseCurrency = syncVariants[0]?.currency || 'USD';

    const id = generateProductId();
    const publicKey = generatePublicKey();
    const slug = generateSlug(syncProduct.name, publicKey);

    return {
      id,
      publicKey,
      slug,
      name: syncProduct.name,
      description: catalogProduct?.description,
      price: basePrice,
      currency: baseCurrency,
      productTypeSlug: undefined,
      tags: [],
      options,
      images,
      thumbnailImage: syncProduct.thumbnail_url ?? undefined,
      variants,
      designFiles: [],
      fulfillmentProvider: 'printful',
      externalProductId: `printful-sync-${syncProduct.id}`,
      source: 'printful',
      assetId: undefined,
      metadata: {
        fees: [],
        providerDetails,
      },
    };
  }

  // ─── Order Shipments (internal, not in contract) ───

  getOrderShipments(orderId: string) {
    return Effect.tryPromise({
      try: async () => {
        const shipments = await this.client.getOrderShipments(orderId);
        return {
          shipments: shipments.map((s: Shipment) => ({
            id: String(s.id),
            carrier: s.carrier,
            service: s.service,
            trackingNumber: '',
            trackingUrl: s.tracking_url,
            status: s.shipment_status,
            shippedAt: s.shipped_at,
            deliveredAt: s.delivered_at,
            deliveryStatus: s.delivery_status,
            estimatedDelivery: s.estimated_delivery
              ? { fromDate: s.estimated_delivery.from_date, toDate: s.estimated_delivery.to_date }
              : undefined,
            trackingEvents: s.tracking_events?.map(e => ({ triggeredAt: e.triggered_at, description: e.description })),
            items: s.shipment_items?.map(i => ({ id: i.id, orderItemId: i.order_item_id, name: i.order_item_name, quantity: i.quantity })),
          })),
        };
      },
      catch: (e) => new Error(`Failed to get Printful shipments: ${e instanceof Error ? e.message : String(e)}`),
    });
  }

  // ─── Webhooks (internal, not in contract) ───

  verifyWebhookSignature(body: string, signature: string, webhookSecret: string) {
    return Effect.sync(() => {
      if (!webhookSecret || !signature) return false;
      const hmac = crypto.createHmac('sha256', Buffer.from(webhookSecret, 'hex'));
      hmac.update(body);
      try {
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(hmac.digest('hex')));
      } catch {
        return false;
      }
    });
  }

  configureWebhooks(params: {
    defaultUrl: string;
    events: PrintfulWebhookEventType[];
    expiresAt?: string | null;
  }) {
    return Effect.tryPromise({
      try: async () => {
        const eventConfigs = params.events.map(type => ({ type }));
        const result = await this.client.configureWebhooks({
          defaultUrl: params.defaultUrl,
          events: eventConfigs,
          expiresAt: params.expiresAt,
        });
        return {
          webhookUrl: result.defaultUrl,
          expiresAt: result.expiresAt ? new Date(result.expiresAt).getTime() : null,
          enabledEvents: result.events.map(e => e.type as PrintfulWebhookEventType),
          publicKey: result.publicKey,
          secretKey: result.secretKey,
        };
      },
      catch: (e) => new Error(`Failed to configure Printful webhooks: ${e instanceof Error ? e.message : String(e)}`),
    });
  }

  disableWebhooks() {
    return Effect.tryPromise({
      try: async () => {
        await this.client.disableWebhooks();
        return { success: true };
      },
      catch: (e) => new Error(`Failed to disable Printful webhooks: ${e instanceof Error ? e.message : String(e)}`),
    });
  }

  getWebhookConfig() {
    return Effect.tryPromise({
      try: async () => {
        const result = await this.client.getWebhookConfig();
        if (!result) return null;
        return {
          webhookUrl: result.defaultUrl,
          expiresAt: result.expiresAt ? new Date(result.expiresAt).getTime() : null,
          enabledEvents: result.events.map(e => e.type as PrintfulWebhookEventType),
          publicKey: result.publicKey,
        };
      },
      catch: (e) => new Error(`Failed to get Printful webhook config: ${e instanceof Error ? e.message : String(e)}`),
    });
  }

  // ─── Mockup Generation Helpers (internal) ───

  generateMockupsForProduct(params: {
    catalogProductId: number;
    variantIds: number[];
    designFiles: Array<{ placement: string; url: string }>;
    mockupStyleIds?: number[];
    format?: 'jpg' | 'png';
  }): Effect.Effect<ProductImage[], Error> {
    return Effect.gen(this, function* () {
      if (params.designFiles.length === 0) return [];
      if (params.variantIds.length === 0) return [];

      let styleIds = params.mockupStyleIds || [];
      if (styleIds.length === 0) {
        const { styles } = yield* this.getMockupStyles(params.catalogProductId);
        const relevant = styles.filter(s => s.category === 'Flat' || s.category === 'Lifestyle' || s.category === "Men's");
        styleIds = relevant.slice(0, 2).map(s => parseInt(s.id, 10));
      }
      if (styleIds.length === 0) return [];

      const images: ProductImage[] = [];
      let order = 1;

      for (const variantId of params.variantIds) {
        try {
          const mockupResult = yield* this.generateMockups({
            providerConfig: { catalogProductId: params.catalogProductId },
            files: params.designFiles.map(df => ({ assetId: `asset-${df.placement}`, url: df.url, slot: df.placement, metadata: { technique: 'dtg' } })),
            variantRefs: [String(variantId)],
            mockupStyleIds: styleIds,
            format: params.format || 'jpg',
          });

          for (const img of mockupResult.images) {
            images.push({
              id: `mockup-${img.styleId || 'default'}-${variantId}-${img.slot}`,
              url: img.imageUrl,
              type: 'mockup',
              placement: img.slot,
              style: img.styleId,
              variantIds: [`printful-variant-${variantId}`],
              order: order++,
            });
          }
        } catch (error) {
          console.error(`Mockup generation failed for variant ${variantId}:`, error);
        }
      }

      return images;
    });
  }
}
