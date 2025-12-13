import { Effect } from 'every-plugin/effect';
import crypto from 'crypto';
import type { ProviderProduct, FulfillmentOrderInput, FulfillmentOrder, FulfillmentOrderStatus } from '../schema';

interface PrintfulSyncProduct {
  id: number;
  external_id: string;
  name: string;
  variants: number;
  synced: number;
  thumbnail_url: string | null;
  is_ignored: boolean;
}

interface PrintfulSyncVariant {
  id: number;
  external_id: string;
  sync_product_id: number;
  name: string;
  synced: boolean;
  variant_id: number;
  retail_price: string | null;
  currency: string;
  product: {
    variant_id: number;
    product_id: number;
    image: string;
    name: string;
  };
  files: Array<{
    id: number;
    type: string;
    url: string;
    preview_url: string | null;
  }>;
}

interface PrintfulCatalogVariant {
  id: number;
  catalog_product_id: number;
  name: string;
  size: string;
  color: string;
  color_code: string;
  color_code2: string | null;
  image: string;
}

interface PrintfulShipmentV2 {
  id: number;
  carrier: string;
  service: string;
  tracking_number: string;
  tracking_url: string;
  shipment_status: string;
  shipped_at: string | null;
  delivery_status: string;
  delivered_at: string | null;
  departure_address: {
    country_name: string;
    country_code: string;
    state_code: string;
  };
  estimated_delivery: {
    from_date: string;
    to_date: string;
    calculated_at: string;
  } | null;
  shipment_items: Array<{
    id: number;
    order_item_id: number;
    order_item_external_id: string | null;
    order_item_name: string;
    quantity: number;
  }>;
  tracking_events: Array<{
    triggered_at: string;
    description: string;
  }>;
}

const PRINTFUL_STATUS_MAP: Record<string, FulfillmentOrderStatus> = {
  draft: 'draft',
  pending: 'pending',
  failed: 'failed',
  canceled: 'cancelled',
  cancelled: 'cancelled',
  inprocess: 'processing',
  onhold: 'onhold',
  partial: 'shipped',
  fulfilled: 'delivered',
  inreview: 'pending',
};

export class PrintfulService {
  private baseUrl = 'https://api.printful.com';
  private v2BaseUrl = 'https://api.printful.com/v2';

  constructor(
    private readonly apiKey: string,
    private readonly storeId?: string
  ) {}

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };
    if (this.storeId) {
      headers['X-PF-Store-Id'] = this.storeId;
    }
    return headers;
  }

  getSyncProducts() {
    return Effect.tryPromise({
      try: async () => {
        const response = await fetch(`${this.baseUrl}/store/products`, {
          headers: this.getHeaders(),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Printful API error: ${response.status} - ${errorBody}`);
        }

        const result = (await response.json()) as { code: number; result: PrintfulSyncProduct[] };
        return result.result;
      },
      catch: (e) => new Error(`Failed to fetch Printful products: ${e instanceof Error ? e.message : String(e)}`),
    });
  }

  getSyncProduct(id: number | string) {
    return Effect.tryPromise({
      try: async () => {
        const response = await fetch(`${this.baseUrl}/store/products/${id}`, {
          headers: this.getHeaders(),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Printful API error: ${response.status} - ${errorBody}`);
        }

        const result = (await response.json()) as {
          code: number;
          result: {
            sync_product: PrintfulSyncProduct;
            sync_variants: PrintfulSyncVariant[];
          };
        };
        return result.result;
      },
      catch: (e) => new Error(`Failed to fetch Printful product: ${e instanceof Error ? e.message : String(e)}`),
    });
  }

  getProducts(options: { limit?: number; offset?: number } = {}) {
    return Effect.gen(this, function* () {
      const syncProducts = yield* this.getSyncProducts();
      const products: ProviderProduct[] = [];

      for (const syncProduct of syncProducts.slice(options.offset || 0, (options.offset || 0) + (options.limit || 50))) {
        const { sync_product, sync_variants } = yield* this.getSyncProduct(syncProduct.id);
        const catalogVariantIds = sync_variants.map(v => v.variant_id).filter(Boolean);
        const catalogVariants = yield* this.getCatalogVariants(catalogVariantIds);
        products.push(this.transformSyncProduct(sync_product, sync_variants, catalogVariants));
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
      return { product: this.transformSyncProduct(sync_product, sync_variants, catalogVariants) };
    });
  }

  getCatalogVariant(variantId: number) {
    return Effect.tryPromise({
      try: async () => {
        const response = await fetch(`${this.v2BaseUrl}/catalog-variants/${variantId}`, {
          headers: this.getHeaders(),
        });

        if (!response.ok) {
          return null;
        }

        const result = (await response.json()) as { data: PrintfulCatalogVariant };
        return result.data;
      },
      catch: () => null,
    });
  }

  getCatalogVariants(variantIds: number[]) {
    return Effect.gen(this, function* () {
      const catalogVariantMap = new Map<number, PrintfulCatalogVariant>();
      
      for (const variantId of variantIds) {
        const catalogVariant = yield* this.getCatalogVariant(variantId);
        if (catalogVariant) {
          catalogVariantMap.set(variantId, catalogVariant);
        }
      }
      
      return catalogVariantMap;
    });
  }

  private transformSyncProduct(
    syncProduct: PrintfulSyncProduct, 
    syncVariants: PrintfulSyncVariant[],
    catalogVariants?: Map<number, PrintfulCatalogVariant>
  ): ProviderProduct {
    return {
      id: `printful-${syncProduct.id}`,
      sourceId: syncProduct.id,
      name: syncProduct.name,
      thumbnailUrl: syncProduct.thumbnail_url || undefined,
      variants: syncVariants.map((variant) => {
        const catalogVariant = catalogVariants?.get(variant.variant_id);
        return {
          id: `printful-variant-${variant.id}`,
          externalId: variant.external_id,
          name: variant.name || syncProduct.name,
          retailPrice: variant.retail_price ? parseFloat(variant.retail_price) : 0,
          currency: variant.currency || 'USD',
          size: catalogVariant?.size,
          color: catalogVariant?.color,
          colorCode: catalogVariant?.color_code,
          catalogVariantId: variant.variant_id,
          catalogProductId: variant.product.product_id,
          files: variant.files?.map((f) => ({
            id: f.id,
            type: f.type,
            url: f.url,
            previewUrl: f.preview_url,
          })),
        };
      }),
    };
  }

  createOrder(input: FulfillmentOrderInput, confirm = false) {
    return Effect.tryPromise({
      try: async () => {
        const orderData = {
          external_id: input.externalId,
          recipient: {
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
          },
          order_items: input.items.map((item) => {
            const orderItem: Record<string, unknown> = {
              source: 'catalog',
              quantity: item.quantity,
            };

            if (item.variantId) {
              orderItem.catalog_variant_id = item.variantId;
            }
            if (item.externalVariantId) {
              orderItem.sync_variant_id = parseInt(item.externalVariantId.replace('printful-variant-', ''), 10);
            }
            if (item.files && item.files.length > 0) {
              orderItem.placements = item.files.map((f) => ({
                placement: f.placement || 'front',
                technique: 'dtg',
                layers: [{ type: 'file', url: f.url }],
              }));
            }

            return orderItem;
          }),
        };

        const response = await fetch(`${this.v2BaseUrl}/orders`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(orderData),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Printful order creation failed: ${response.status} - ${errorBody}`);
        }

        const result = (await response.json()) as {
          data: { id: number; external_id: string | null; status: string };
        };

        const orderId = result.data.id;

        if (confirm) {
          await fetch(`${this.v2BaseUrl}/orders/${orderId}/confirmation`, {
            method: 'POST',
            headers: this.getHeaders(),
          });
        }

        return { id: String(orderId), status: result.data.status };
      },
      catch: (e) => new Error(`Printful order failed: ${e instanceof Error ? e.message : String(e)}`),
    });
  }

  getOrder(id: string) {
    return Effect.tryPromise({
      try: async () => {
        const response = await fetch(`${this.v2BaseUrl}/orders/${id}`, {
          headers: this.getHeaders(),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Failed to get order: ${response.status} - ${errorBody}`);
        }

        const result = (await response.json()) as { data: Record<string, unknown> };
        const data = result.data;

        const order: FulfillmentOrder = {
          id: String(data.id),
          externalId: data.external_id as string | undefined,
          status: PRINTFUL_STATUS_MAP[(data.status as string)?.toLowerCase()] || 'pending',
          created: data.created_at ? new Date(data.created_at as string).getTime() : Date.now(),
          updated: data.updated_at ? new Date(data.updated_at as string).getTime() : Date.now(),
          recipient: {
            name: (data.recipient as Record<string, string>)?.name || '',
            address1: (data.recipient as Record<string, string>)?.address1 || '',
            city: (data.recipient as Record<string, string>)?.city || '',
            stateCode: (data.recipient as Record<string, string>)?.state_code || '',
            countryCode: (data.recipient as Record<string, string>)?.country_code || '',
            zip: (data.recipient as Record<string, string>)?.zip || '',
            email: (data.recipient as Record<string, string>)?.email || '',
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
        const response = await fetch(`${this.v2BaseUrl}/orders/${orderId}/shipments`, {
          headers: this.getHeaders(),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Failed to get shipments: ${response.status} - ${errorBody}`);
        }

        const result = (await response.json()) as { data: PrintfulShipmentV2[] };

        return {
          shipments: result.data.map((s) => ({
            id: String(s.id),
            carrier: s.carrier || '',
            service: s.service || '',
            trackingNumber: s.tracking_number || '',
            trackingUrl: s.tracking_url || '',
            status: s.shipment_status || '',
            shippedAt: s.shipped_at,
            deliveredAt: s.delivered_at,
            deliveryStatus: s.delivery_status,
            estimatedDelivery: s.estimated_delivery ? {
              fromDate: s.estimated_delivery.from_date,
              toDate: s.estimated_delivery.to_date,
            } : undefined,
            trackingEvents: s.tracking_events?.map((e) => ({
              triggeredAt: e.triggered_at,
              description: e.description,
            })),
            items: s.shipment_items?.map((i) => ({
              id: i.id,
              orderItemId: i.order_item_id,
              name: i.order_item_name,
              quantity: i.quantity,
            })),
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
          shipments: shipments.map((s) => ({
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

      const secretBuffer = Buffer.from(webhookSecret, 'hex');
      const hmac = crypto.createHmac('sha256', secretBuffer);
      hmac.update(body);
      const calculatedSignature = hmac.digest('hex');

      try {
        return crypto.timingSafeEqual(
          Buffer.from(signature),
          Buffer.from(calculatedSignature)
        );
      } catch {
        return false;
      }
    });
  }

  mapStatus(status: string): FulfillmentOrderStatus {
    return PRINTFUL_STATUS_MAP[status.toLowerCase()] || 'pending';
  }
}
