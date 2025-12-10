import { Effect } from 'every-plugin/effect';
import type { ShippingAddress, TrackingInfo, OrderStatus, Product, ProductCategory } from '../schema';

export interface FulfillmentOrderData {
  orderReferenceId: string;
  customerReferenceId: string;
  currency: string;
  items: Array<{
    itemReferenceId: string;
    productUid: string;
    files: Array<{
      type: string;
      url: string;
    }>;
    quantity: number;
  }>;
  shipmentMethodUid: string;
  shippingAddress: ShippingAddress;
  returnAddress: ShippingAddress;
}

export interface PrintfulOrderData {
  external_id?: string;
  recipient: {
    name: string;
    company?: string;
    address1: string;
    address2?: string;
    city: string;
    state_code: string;
    country_code: string;
    zip: string;
    phone?: string;
    email: string;
  };
  items: Array<{
    sync_variant_id?: number;
    variant_id?: number;
    quantity: number;
    files?: Array<{
      type?: string;
      url: string;
    }>;
    retail_price?: string;
  }>;
  retail_costs?: {
    shipping?: string;
  };
}

export interface PrintfulSyncProduct {
  id: number;
  external_id: string;
  name: string;
  variants: number;
  synced: number;
  thumbnail_url: string | null;
  is_ignored: boolean;
}

export interface PrintfulSyncVariant {
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

export interface FulfillmentService {
  createOrder(data: FulfillmentOrderData): Effect.Effect<{ id: string }, Error>;
  verifyWebhookSignature(body: string, signature: string): Effect.Effect<boolean, Error>;
}

const ORDER_STATUS_MAP: Record<string, OrderStatus> = {
  passed: 'processing',
  completed: 'processing',
  printing: 'printing',
  shipped: 'shipped',
  delivered: 'delivered',
  cancelled: 'cancelled',
  canceled: 'cancelled',
};

export function mapFulfillmentStatus(status: string): OrderStatus {
  return ORDER_STATUS_MAP[status.toLowerCase()] || 'processing';
}

export function parseTrackingInfo(items: any[]): TrackingInfo[] {
  const trackingInfos: TrackingInfo[] = [];
  
  for (const item of items || []) {
    for (const fulfillment of item.fulfillments || []) {
      trackingInfos.push({
        trackingCode: fulfillment.trackingCode,
        trackingUrl: fulfillment.trackingUrl,
        shipmentMethodName: fulfillment.shipmentMethodName,
        shipmentMethodUid: fulfillment.shipmentMethodUid,
        fulfillmentCountry: fulfillment.fulfillmentCountry,
        fulfillmentStateProvince: fulfillment.fulfillmentStateProvince,
        fulfillmentFacilityId: fulfillment.fulfillmentFacilityId,
      });
    }
  }
  
  return trackingInfos;
}

export class GelatoFulfillmentService implements FulfillmentService {
  private apiKey: string;
  private webhookSecret: string;
  private returnAddress: ShippingAddress;
  private baseUrl = 'https://order.gelatoapis.com/v4';

  constructor(apiKey: string, webhookSecret: string, returnAddress?: ShippingAddress) {
    this.apiKey = apiKey;
    this.webhookSecret = webhookSecret;
    this.returnAddress = returnAddress || {
      firstName: 'Returns',
      lastName: 'Department',
      companyName: 'Returns Dept',
      addressLine1: '123 Return St',
      city: 'Los Angeles',
      state: 'CA',
      postCode: '90001',
      country: 'US',
      email: 'returns@example.com',
      phone: '5555555555',
    };
  }

  createOrder(data: FulfillmentOrderData) {
    return Effect.tryPromise({
      try: async () => {
        const response = await fetch(`${this.baseUrl}/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': this.apiKey,
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error('Gelato API error response:', errorBody);
          throw new Error(`Gelato API error: ${response.status} ${response.statusText}`);
        }

        const result = (await response.json()) as { id: string };
        return { id: result.id };
      },
      catch: (error: unknown) =>
        new Error(`Fulfillment order failed: ${error instanceof Error ? error.message : String(error)}`),
    });
  }

  verifyWebhookSignature(body: string, signature: string) {
    return Effect.sync(() => {
      return signature === this.webhookSecret;
    });
  }

  getReturnAddress(): ShippingAddress {
    return this.returnAddress;
  }

  buildOrderData(params: {
    orderId: string;
    userId: string;
    productUid: string;
    fileUrl: string;
    quantity: number;
    currency: string;
    shippingAddress: ShippingAddress;
    fulfillmentReferenceId: string;
  }): FulfillmentOrderData {
    return {
      orderReferenceId: params.fulfillmentReferenceId,
      customerReferenceId: params.userId,
      currency: params.currency,
      items: [
        {
          itemReferenceId: `item_${params.orderId}`,
          productUid: params.productUid,
          files: [
            {
              type: 'default',
              url: params.fileUrl,
            },
          ],
          quantity: params.quantity,
        },
      ],
      shipmentMethodUid: 'express',
      shippingAddress: params.shippingAddress,
      returnAddress: this.getReturnAddress(),
    };
  }
}

const PRINTFUL_ORDER_STATUS_MAP: Record<string, OrderStatus> = {
  draft: 'pending',
  pending: 'processing',
  failed: 'cancelled',
  canceled: 'cancelled',
  inprocess: 'printing',
  onhold: 'processing',
  partial: 'shipped',
  fulfilled: 'delivered',
};

export function mapPrintfulStatus(status: string): OrderStatus {
  return PRINTFUL_ORDER_STATUS_MAP[status.toLowerCase()] || 'processing';
}

export function parsePrintfulTrackingInfo(shipments: any[]): TrackingInfo[] {
  const trackingInfos: TrackingInfo[] = [];

  for (const shipment of shipments || []) {
    if (shipment.tracking_number) {
      trackingInfos.push({
        trackingCode: shipment.tracking_number,
        trackingUrl: shipment.tracking_url || '',
        shipmentMethodName: shipment.service || 'Standard',
        shipmentMethodUid: shipment.carrier,
        fulfillmentCountry: shipment.ship_from?.country,
        fulfillmentStateProvince: shipment.ship_from?.state,
      });
    }
  }

  return trackingInfos;
}

export class PrintfulFulfillmentService {
  private apiKey: string;
  private storeId?: string;
  private baseUrl = 'https://api.printful.com';

  constructor(apiKey: string, storeId?: string) {
    this.apiKey = apiKey;
    this.storeId = storeId;
  }

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
          method: 'GET',
          headers: this.getHeaders(),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error('Printful API error response:', errorBody);
          throw new Error(`Printful API error: ${response.status} ${response.statusText}`);
        }

        const result = (await response.json()) as {
          code: number;
          result: PrintfulSyncProduct[];
        };
        return result.result;
      },
      catch: (error: unknown) =>
        new Error(`Failed to fetch Printful products: ${error instanceof Error ? error.message : String(error)}`),
    });
  }

  getSyncProduct(id: number | string) {
    return Effect.tryPromise({
      try: async () => {
        const response = await fetch(`${this.baseUrl}/store/products/${id}`, {
          method: 'GET',
          headers: this.getHeaders(),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error('Printful API error response:', errorBody);
          throw new Error(`Printful API error: ${response.status} ${response.statusText}`);
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
      catch: (error: unknown) =>
        new Error(`Failed to fetch Printful product: ${error instanceof Error ? error.message : String(error)}`),
    });
  }

  getCatalogProduct(productId: number) {
    return Effect.tryPromise({
      try: async () => {
        const response = await fetch(`${this.baseUrl}/products/${productId}`, {
          method: 'GET',
          headers: this.getHeaders(),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error('Printful API error response:', errorBody);
          throw new Error(`Printful API error: ${response.status} ${response.statusText}`);
        }

        const result = (await response.json()) as {
          code: number;
          result: {
            product: any;
            variants: any[];
          };
        };
        return result.result;
      },
      catch: (error: unknown) =>
        new Error(`Failed to fetch Printful catalog product: ${error instanceof Error ? error.message : String(error)}`),
    });
  }

  createOrder(data: PrintfulOrderData, confirm = false) {
    return Effect.tryPromise({
      try: async () => {
        const url = confirm
          ? `${this.baseUrl}/orders?confirm=1`
          : `${this.baseUrl}/orders`;

        const response = await fetch(url, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error('Printful API error response:', errorBody);
          throw new Error(`Printful API error: ${response.status} ${response.statusText}`);
        }

        const result = (await response.json()) as {
          code: number;
          result: {
            id: number;
            external_id: string | null;
            status: string;
          };
        };
        return { id: String(result.result.id) };
      },
      catch: (error: unknown) =>
        new Error(`Printful order failed: ${error instanceof Error ? error.message : String(error)}`),
    });
  }

  getOrder(orderId: string | number) {
    return Effect.tryPromise({
      try: async () => {
        const response = await fetch(`${this.baseUrl}/orders/${orderId}`, {
          method: 'GET',
          headers: this.getHeaders(),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error('Printful API error response:', errorBody);
          throw new Error(`Printful API error: ${response.status} ${response.statusText}`);
        }

        const result = (await response.json()) as {
          code: number;
          result: any;
        };
        return result.result;
      },
      catch: (error: unknown) =>
        new Error(`Failed to get Printful order: ${error instanceof Error ? error.message : String(error)}`),
    });
  }

  confirmOrder(orderId: string | number) {
    return Effect.tryPromise({
      try: async () => {
        const response = await fetch(`${this.baseUrl}/orders/${orderId}/confirm`, {
          method: 'POST',
          headers: this.getHeaders(),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error('Printful API error response:', errorBody);
          throw new Error(`Printful API error: ${response.status} ${response.statusText}`);
        }

        const result = (await response.json()) as {
          code: number;
          result: any;
        };
        return result.result;
      },
      catch: (error: unknown) =>
        new Error(`Failed to confirm Printful order: ${error instanceof Error ? error.message : String(error)}`),
    });
  }

  transformSyncProductToProduct(
    syncProduct: PrintfulSyncProduct,
    syncVariants: PrintfulSyncVariant[]
  ): Product[] {
    return syncVariants.map((variant) => ({
      id: `printful-${variant.id}`,
      name: variant.name || syncProduct.name,
      description: `${syncProduct.name} - ${variant.product.name}`,
      price: variant.retail_price ? parseFloat(variant.retail_price) : 0,
      currency: variant.currency || 'USD',
      category: 'Exclusives' as ProductCategory,
      image: variant.product.image || syncProduct.thumbnail_url || '',
      fulfillmentProvider: 'printful' as const,
      fulfillmentConfig: {
        printfulSyncVariantId: variant.id,
        printfulVariantId: variant.variant_id,
        fileUrl: variant.files?.[0]?.url,
      },
    }));
  }

  buildOrderData(params: {
    orderId: string;
    syncVariantId?: number;
    variantId?: number;
    fileUrl?: string;
    quantity: number;
    shippingAddress: ShippingAddress;
  }): PrintfulOrderData {
    const item: PrintfulOrderData['items'][0] = {
      quantity: params.quantity,
    };

    if (params.syncVariantId) {
      item.sync_variant_id = params.syncVariantId;
    } else if (params.variantId) {
      item.variant_id = params.variantId;
      if (params.fileUrl) {
        item.files = [{ url: params.fileUrl }];
      }
    }

    return {
      external_id: params.orderId,
      recipient: {
        name: `${params.shippingAddress.firstName} ${params.shippingAddress.lastName}`,
        company: params.shippingAddress.companyName,
        address1: params.shippingAddress.addressLine1,
        address2: params.shippingAddress.addressLine2,
        city: params.shippingAddress.city,
        state_code: params.shippingAddress.state,
        country_code: params.shippingAddress.country,
        zip: params.shippingAddress.postCode,
        phone: params.shippingAddress.phone,
        email: params.shippingAddress.email,
      },
      items: [item],
    };
  }
}
