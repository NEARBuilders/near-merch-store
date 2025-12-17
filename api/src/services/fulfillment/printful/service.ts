import { Effect } from 'every-plugin/effect';
import crypto from 'crypto';
import { 
  CatalogItem, 
  TechniqueEnum, 
  MockupTaskCreation,
  MockupGeneratorTask,
  type Address, 
  type Shipment, 
  type Variant,
  type MockupStyles
} from 'printful-sdk-js-v2';
import type {
  ProviderProduct,
  FulfillmentOrderInput,
  FulfillmentOrder,
  FulfillmentOrderStatus,
  ProviderVariant,
  ShippingQuoteInput,
  ShippingQuoteOutput,
  ShippingRate
} from '../schema';
import type { ProductImage } from '../../../schema';
import {
  type PrintfulSyncProduct,
  type PrintfulSyncVariant,
  extractDesignFiles,
  type MockupStyleInfo,
  type MockupTaskResult,
  type MockupResult
} from './types';
import { PrintfulClient } from './client';

export class PrintfulService {
  private client: PrintfulClient;
  private apiKey: string;
  private storeId: string;

  constructor(apiKey: string, storeId: string, baseUrl = 'https://api.printful.com') {
    this.client = new PrintfulClient(apiKey, storeId, baseUrl);
    this.apiKey = apiKey;
    this.storeId = storeId;
  }

  getSyncProducts() {
    return Effect.tryPromise({
      try: () => this.client.getSyncProducts(),
      catch: (e) => new Error(`Failed to fetch Printful products: ${e instanceof Error ? e.message : String(e)}`),
    });
  }

  getSyncProduct(id: number | string) {
    return Effect.tryPromise({
      try: () => this.client.getSyncProduct(id),
      catch: (e) => new Error(`Failed to fetch Printful product: ${e instanceof Error ? e.message : String(e)}`),
    });
  }

  getProducts(options: { limit?: number; offset?: number } = {}) {
    return Effect.gen(this, function* () {
      const syncProducts = yield* this.getSyncProducts();
      const products: ProviderProduct[] = [];
      const start = options.offset || 0;
      const end = start + (options.limit || 50);

      for (const syncProduct of syncProducts.slice(start, end)) {
        const { sync_product, sync_variants } = yield* this.getSyncProduct(syncProduct.id);
        const catalogVariantIds = sync_variants.map(v => v.variant_id).filter(Boolean);
        const catalogVariants = yield* this.getCatalogVariants(catalogVariantIds);
        products.push(this.transformProduct(sync_product, sync_variants, catalogVariants));
      }

      return { products, total: syncProducts.length };
    });
  }

  getProduct(id: string) {
    return Effect.gen(this, function* () {
      const numericId = parseInt(id.replace('printful-', ''), 10);
      const { sync_product, sync_variants } = yield* this.getSyncProduct(numericId);
      const catalogVariantIds = sync_variants.map(v => v.variant_id).filter(Boolean);
      const catalogVariants = yield* this.getCatalogVariants(catalogVariantIds);
      return { product: this.transformProduct(sync_product, sync_variants, catalogVariants) };
    });
  }

  getCatalogVariant(variantId: number) {
    return Effect.tryPromise({
      try: () => this.client.getCatalogVariant(variantId),
      catch: () => null,
    });
  }

  getCatalogVariants(variantIds: number[]) {
    return Effect.gen(this, function* () {
      const map = new Map<number, Variant>();
      for (const id of variantIds) {
        const variant = yield* this.getCatalogVariant(id);
        if (variant) map.set(id, variant);
      }
      return map;
    });
  }

  private transformProduct(
    syncProduct: PrintfulSyncProduct,
    syncVariants: PrintfulSyncVariant[],
    catalogVariants: Map<number, Variant>
  ): ProviderProduct {
    return {
      id: syncProduct.id,
      sourceId: syncProduct.id,
      name: syncProduct.name,
      thumbnailUrl: syncProduct.thumbnail_url ?? undefined,
      variants: syncVariants.map(v => this.transformVariant(v, syncProduct.name, catalogVariants.get(v.variant_id))),
    };
  }

  private transformVariant(
    variant: PrintfulSyncVariant,
    productName: string,
    catalogVariant?: Variant
  ): ProviderVariant {
    const files = variant.files?.map(f => ({
      id: f.id,
      type: f.type,
      url: f.url,
      previewUrl: f.preview_url,
    }));

    return {
      id: variant.id,
      externalId: variant.external_id,
      name: variant.name || productName,
      retailPrice: variant.retail_price ? parseFloat(variant.retail_price) : 0,
      currency: variant.currency || 'USD',
      size: catalogVariant?.size,
      color: catalogVariant?.color ?? undefined,
      colorCode: catalogVariant?.color_code ?? undefined,
      catalogVariantId: variant.variant_id,
      catalogProductId: variant.product.product_id,
      files,
      designFiles: extractDesignFiles(files),
    };
  }

  calculateShippingRates(params: {
    recipient: {
      countryCode: string;
      stateCode?: string;
      city?: string;
      zip?: string;
    };
    items: Array<{ variantId: number; quantity: number }>;
    currency?: string;
  }) {
    return Effect.tryPromise({
      try: async () => {
        const response = await fetch('https://api.printful.com/v2/shipping-rates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'X-PF-Store-Id': this.storeId,
          },
          body: JSON.stringify({
            recipient: {
              country_code: params.recipient.countryCode,
              state_code: params.recipient.stateCode,
              city: params.recipient.city,
              zip: params.recipient.zip,
            },
            order_items: params.items.map(item => ({
              catalog_variant_id: item.variantId,
              quantity: item.quantity,
            })),
            currency: params.currency || 'USD',
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Printful shipping rates failed: ${response.status} - ${errorBody}`);
        }

        const data = await response.json() as { data: Array<{
          id: string;
          name: string;
          rate: string;
          currency: string;
          min_delivery_days?: number;
          max_delivery_days?: number;
          min_delivery_date?: string;
          max_delivery_date?: string;
        }> };

        return {
          rates: (data.data || []).map(rate => ({
            id: rate.id,
            name: rate.name,
            rate: parseFloat(rate.rate),
            currency: rate.currency,
            minDeliveryDays: rate.min_delivery_days,
            maxDeliveryDays: rate.max_delivery_days,
            minDeliveryDate: rate.min_delivery_date,
            maxDeliveryDate: rate.max_delivery_date,
          })),
          currency: params.currency || 'USD',
        };
      },
      catch: (e) => new Error(`Failed to calculate shipping rates: ${e instanceof Error ? e.message : String(e)}`),
    });
  }

  quoteOrder(input: ShippingQuoteInput): Effect.Effect<ShippingQuoteOutput, Error> {
    return Effect.gen(this, function* () {
      const items = input.items
        .filter(item => item.variantId)
        .map(item => ({
          variantId: item.variantId!,
          quantity: item.quantity,
        }));

      if (items.length === 0) {
        return {
          rates: [],
          currency: input.currency || 'USD',
        };
      }

      const result = yield* this.calculateShippingRates({
        recipient: {
          countryCode: input.recipient.countryCode,
          stateCode: input.recipient.stateCode,
          city: input.recipient.city,
          zip: input.recipient.zip,
        },
        items,
        currency: input.currency,
      });

      return result;
    });
  }

  confirmOrder(orderId: string) {
    return Effect.gen(this, function* () {
      yield* Effect.tryPromise({
        try: () => this.client.confirmOrder(parseInt(orderId, 10)),
        catch: (e) => new Error(`Failed to confirm Printful order: ${e instanceof Error ? e.message : String(e)}`),
      });
      
      const { order } = yield* this.getOrder(orderId);
      return { id: orderId, status: order.status };
    });
  }

  cancelOrder(orderId: string) {
    return Effect.gen(this, function* () {
      yield* Effect.tryPromise({
        try: () => this.client.cancelOrder(parseInt(orderId, 10)),
        catch: (e) => new Error(`Failed to cancel Printful order: ${e instanceof Error ? e.message : String(e)}`),
      });
      
      return { id: orderId, status: 'cancelled' };
    });
  }

  createOrder(input: FulfillmentOrderInput, confirm = false) {
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
        };

        const orderItems: CatalogItem[] = input.items.map(item => ({
          source: CatalogItem.source.CATALOG,
          catalog_variant_id: item.variantId ?? 0,
          quantity: item.quantity,
          placements: item.files
            ?.filter(f => f.placement)
            .map(f => ({
              placement: f.placement!,
              technique: TechniqueEnum.DTG,
              layers: [{ type: 'file', url: f.url }],
            })),
        }));

        const result = await this.client.createOrder({
          external_id: input.externalId,
          recipient,
          order_items: orderItems,
        });
        
        if (confirm) await this.client.confirmOrder(result.id);
        return { id: String(result.id), status: result.status };
      },
      catch: (e) => new Error(`Printful order failed: ${e instanceof Error ? e.message : String(e)}`),
    });
  }

  getOrder(id: string) {
    return Effect.tryPromise({
      try: async () => {
        const data = await this.client.getOrder(id);
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
      catch: (e) => new Error(`Failed to get Printful order: ${e instanceof Error ? e.message : String(e)}`),
    });
  }

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

  getOrderWithShipments(id: string) {
    return Effect.gen(this, function* () {
      const { order } = yield* this.getOrder(id);
      const { shipments } = yield* this.getOrderShipments(id);
      return {
        order: {
          ...order,
          shipments: shipments.map(s => ({
            id: s.id,
            carrier: s.carrier,
            service: s.service,
            trackingNumber: s.trackingNumber,
            trackingUrl: s.trackingUrl,
            status: s.status,
          })),
        },
      };
    });
  }

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

  getMockupStyles(productId: number) {
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

  generateMockups(params: {
    productId: number;
    variantIds: number[];
    files: Array<{ placement: string; imageUrl: string; technique?: string }>;
    mockupStyleIds?: number[];
    format?: 'jpg' | 'png';
  }) {
    return Effect.tryPromise({
      try: async () => {
        const placements = params.files.map((f) => ({
          placement: f.placement,
          technique: f.technique || TechniqueEnum.DTG,
          layers: [{ type: 'file', url: f.imageUrl }],
        }));

        const payload = {
          format: params.format === 'png' ? MockupTaskCreation.format.PNG : MockupTaskCreation.format.JPG,
          products: [{
            source: 'catalog' as const,
            mockup_style_ids: params.mockupStyleIds || [],
            catalog_product_id: params.productId,
            catalog_variant_ids: params.variantIds,
            placements,
          }],
        };

        const response = await this.client.mockupGeneratorV2.createMockupGeneratorTasks(this.storeId, payload);
        const tasks = (response?.data ?? []) as Array<{ id?: number }>;
        return { taskId: String(tasks[0]?.id || '') };
      },
      catch: (e) => new Error(`Failed to generate mockups: ${e instanceof Error ? e.message : String(e)}`),
    });
  }

  getMockupResult(taskId: string) {
    return Effect.tryPromise({
      try: async () => {
        const response = await this.client.mockupGeneratorV2.getMockupGeneratorTasks([taskId]);
        const tasks = (response?.data ?? []) as MockupGeneratorTask[];
        const task = tasks[0];

        if (!task) return { status: 'failed' as const, mockups: [] };

        if (task.status === MockupGeneratorTask.status.COMPLETED) {
          const mockups: MockupResult[] = [];
          for (const variantMockup of task.catalog_variant_mockups) {
            for (const mockup of variantMockup.mockups) {
              mockups.push({
                variantId: variantMockup.catalog_variant_id,
                placement: mockup.placement,
                style: String(mockup.style_id),
                imageUrl: mockup.mockup_url,
              });
            }
          }
          return { status: 'completed' as const, mockups };
        }

        if (task.status === MockupGeneratorTask.status.FAILED) {
          return { status: 'failed' as const, mockups: [], error: task.failure_reasons.map(e => e.detail).join(', ') };
        }

        return { status: 'pending' as const, mockups: [] };
      },
      catch: (e) => new Error(`Failed to get mockup result: ${e instanceof Error ? e.message : String(e)}`),
    });
  }

  pollMockupTask(taskId: string, maxAttempts = 30, intervalMs = 2000): Effect.Effect<MockupTaskResult, Error> {
    return Effect.gen(this, function* () {
      let attempts = 0;
      while (attempts < maxAttempts) {
        const result = yield* this.getMockupResult(taskId);
        if (result.status === 'completed') return result;
        if (result.status === 'failed') return yield* Effect.fail(new Error(`Mockup generation failed: ${result.error}`));
        yield* Effect.sleep(`${intervalMs} millis`);
        attempts++;
      }
      return yield* Effect.fail(new Error(`Mockup generation timed out for task ${taskId}`));
    });
  }

  generateAndWaitForMockups(params: {
    productId: number;
    variantIds: number[];
    files: Array<{ placement: string; imageUrl: string; technique?: string }>;
    mockupStyleIds?: number[];
    format?: 'jpg' | 'png';
  }): Effect.Effect<MockupTaskResult, Error> {
    return Effect.gen(this, function* () {
      const { taskId } = yield* this.generateMockups(params);
      return yield* this.pollMockupTask(taskId);
    });
  }

  static groupVariantsByColor(variants: ProviderVariant[]): Map<string, ProviderVariant[]> {
    const map = new Map<string, ProviderVariant[]>();
    for (const v of variants) {
      const key = v.colorCode || v.color || 'default';
      const group = map.get(key) || [];
      group.push(v);
      map.set(key, group);
    }
    return map;
  }

  generateMockupsForProduct(params: {
    catalogProductId: number;
    variants: ProviderVariant[];
    designFiles: Array<{ placement: string; url: string }>;
    mockupStyleIds?: number[];
    format?: 'jpg' | 'png';
  }): Effect.Effect<ProductImage[], Error> {
    return Effect.gen(this, function* () {
      if (params.designFiles.length === 0) return [];

      const colorGroups = PrintfulService.groupVariantsByColor(params.variants);

      let styleIds = params.mockupStyleIds || [];
      if (styleIds.length === 0) {
        const { styles } = yield* this.getMockupStyles(params.catalogProductId);
        const relevant = styles.filter(s => s.category === 'Flat' || s.category === 'Lifestyle' || s.category === "Men's");
        styleIds = relevant.slice(0, 2).map(s => parseInt(s.id, 10));
      }

      if (styleIds.length === 0) return [];

      const images: ProductImage[] = [];
      let order = 1;

      for (const [colorKey, colorVariants] of colorGroups) {
        const rep = colorVariants[0];
        if (!rep?.catalogVariantId) continue;

        const variantIds = colorVariants.map(v => `printful-variant-${v.id}`).filter(Boolean);

        try {
          const result = yield* this.generateAndWaitForMockups({
            productId: params.catalogProductId,
            variantIds: [rep.catalogVariantId],
            files: params.designFiles.map(df => ({ placement: df.placement, imageUrl: df.url, technique: 'dtg' })),
            mockupStyleIds: styleIds,
            format: params.format || 'jpg',
          });

          for (const mockup of result.mockups) {
            images.push({
              id: `mockup-${mockup.style}-${colorKey}-${mockup.placement}`,
              url: mockup.imageUrl,
              type: 'mockup',
              placement: mockup.placement,
              style: mockup.style,
              variantIds,
              order: order++,
            });
          }
        } catch (error) {
          console.error(`Mockup generation failed for color ${colorKey}:`, error);
        }
      }

      return images;
    });
  }
}
