import {
  PrintfulClient as PrintfulSDK,
  type Address,
  type CatalogItem,
  type Order,
  type Shipment,
  type Variant
} from 'printful-sdk-js-v2';
import {
  type PrintfulSyncProduct,
  type PrintfulSyncVariant
} from './types';

interface PrintfulResponse<T> {
  code: number;
  result: T;
}

export type { Address, CatalogItem, Order, Shipment, Variant } from 'printful-sdk-js-v2';

export class PrintfulClient {
  private sdk: PrintfulSDK;
  private v1BaseUrl: string;

  constructor(
    private readonly apiKey: string,
    private readonly storeId: string,
    baseUrl = 'https://api.printful.com'
  ) {
    this.sdk = new PrintfulSDK({ TOKEN: apiKey });
    this.v1BaseUrl = baseUrl;
  }

  get catalogV2() {
    return this.sdk.catalogV2;
  }

  get ordersV2() {
    return this.sdk.ordersV2;
  }

  get mockupGeneratorV2() {
    return this.sdk.mockupGeneratorV2;
  }

  get filesV2() {
    return this.sdk.filesV2;
  }

  getStoreId(): string {
    return this.storeId;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'X-PF-Store-Id': this.storeId,
    };
  }

  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: { ...this.getHeaders(), ...options?.headers },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Printful API error: ${response.status} - ${errorBody}`);
    }

    return response.json() as T;
  }

  async getSyncProducts(): Promise<PrintfulSyncProduct[]> {
    const result = await this.request<PrintfulResponse<PrintfulSyncProduct[]>>(
      `${this.v1BaseUrl}/store/products`
    );
    return result.result;
  }

  async getSyncProduct(id: number | string): Promise<{
    sync_product: PrintfulSyncProduct;
    sync_variants: PrintfulSyncVariant[];
  }> {
    const result = await this.request<PrintfulResponse<{
      sync_product: PrintfulSyncProduct;
      sync_variants: PrintfulSyncVariant[];
    }>>(`${this.v1BaseUrl}/store/products/${id}`);
    return result.result;
  }

  async getCatalogVariant(variantId: number): Promise<Variant | null> {
    try {
      const result = await this.sdk.catalogV2.getVariantById(variantId);
      return (result?.data ?? null) as Variant | null;
    } catch (e) {
      console.error(`[PrintfulClient] Failed to fetch catalog variant ${variantId}:`, e);
      return null;
    }
  }

  async createOrder(orderInput: {
    external_id?: string;
    shipping?: string;
    recipient: Address;
    order_items: CatalogItem[];
  }): Promise<Order> {
    try {
      const result = await this.sdk.ordersV2.createOrder(this.storeId, orderInput);
      return result.data as Order;
    } catch (e) {
      console.error('[PrintfulClient] createOrder failed:');
      console.error('[PrintfulClient] Input:', JSON.stringify(orderInput, null, 2));
      if (e && typeof e === 'object') {
        console.error('[PrintfulClient] Error details:', JSON.stringify(e, null, 2));
      }
      throw e;
    }
  }

  async createOrderV1(orderInput: {
    external_id?: string;
    shipping?: string;
    recipient: Address;
    items: Array<{
      sync_variant_id: number;
      quantity: number;
      retail_price?: string;
      name?: string;
      external_id?: string;
    }>;
    retail_costs?: {
      currency?: string;
      subtotal?: string;
      discount?: string;
      shipping?: string;
      tax?: string;
    };
  }): Promise<Order> {
    try {
      const result = await this.request<PrintfulResponse<Order>>(
        `${this.v1BaseUrl}/orders`,
        {
          method: 'POST',
          body: JSON.stringify(orderInput),
        }
      );
      return result.result;
    } catch (e) {
      console.error('[PrintfulClient] createOrderV1 failed:');
      console.error('[PrintfulClient] Input:', JSON.stringify(orderInput, null, 2));
      if (e && typeof e === 'object') {
        console.error('[PrintfulClient] Error details:', JSON.stringify(e, null, 2));
      }
      throw e;
    }
  }

  async confirmOrder(orderId: number): Promise<void> {
    await this.request<PrintfulResponse<{ result: string }>>(
      `${this.v1BaseUrl}/orders/${orderId}/confirm`,
      { method: 'POST' }
    );
  }

  async cancelOrder(orderId: number): Promise<void> {
    await this.request<PrintfulResponse<{ result: string }>>(
      `${this.v1BaseUrl}/orders/${orderId}/cancel`,
      { method: 'DELETE' }
    );
  }

  async getOrder(orderId: string): Promise<Order> {
    const result = await this.sdk.ordersV2.getOrder(orderId, this.storeId);
    return result.data as Order;
  }

  async getOrderShipments(orderId: string): Promise<Shipment[]> {
    const result = await this.sdk.ordersV2.getShipments(orderId, this.storeId);
    return (result?.data ?? []) as Shipment[];
  }

  get webhookV2() {
    return this.sdk.webhookV2;
  }

  async configureWebhooks(params: {
    defaultUrl: string;
    events: Array<{ type: string }>;
    expiresAt?: string | null;
  }): Promise<{
    defaultUrl: string;
    expiresAt: string | null;
    events: Array<{ type: string; url: string | null }>;
    publicKey: string;
    secretKey: string;
  }> {
    const response = await this.sdk.webhookV2.createWebhook(
      {
        default_url: params.defaultUrl,
        expires_at: params.expiresAt || null,
        events: params.events,
      } as unknown as Record<string, unknown>,
      this.storeId
    );

    const data = response as unknown as {
      data: {
        default_url: string;
        expires_at: string | null;
        events: Array<{ type: string; url: string | null }>;
        public_key: string;
        secret_key: string;
      };
    };

    return {
      defaultUrl: data.data.default_url,
      expiresAt: data.data.expires_at,
      events: data.data.events,
      publicKey: data.data.public_key,
      secretKey: data.data.secret_key,
    };
  }

  async disableWebhooks(): Promise<void> {
    await this.sdk.webhookV2.disableWebhook(this.storeId);
  }

  async getWebhookConfig(): Promise<{
    defaultUrl: string;
    expiresAt: string | null;
    events: Array<{ type: string; url: string | null }>;
    publicKey: string;
  } | null> {
    try {
      const response = await this.sdk.webhookV2.getWebhooks(this.storeId);

      const data = response as unknown as {
        data: {
          default_url: string;
          expires_at: string | null;
          events: Array<{ type: string; url: string | null }>;
          public_key: string;
        };
      };

      if (!data?.data?.default_url) {
        return null;
      }

      return {
        defaultUrl: data.data.default_url,
        expiresAt: data.data.expires_at,
        events: data.data.events,
        publicKey: data.data.public_key,
      };
    } catch (error) {
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  get storesV2() {
    return this.sdk.storesV2;
  }

  async calculateTaxRate(params: {
    recipient: {
      country_code: string;
      state_code?: string;
      zip?: string;
      city?: string;
      tax_number?: string;
    };
    items: Array<{
      catalog_variant_id: number;
      quantity: number;
    }>;
    currency?: string;
  }): Promise<{
    required: boolean;
    rate: number;
    shipping_taxable: boolean;
  }> {
    const result = await this.request<PrintfulResponse<{
      required: boolean;
      rate: number;
      shipping_taxable: boolean;
    }>>(
      `${this.v1BaseUrl}/tax/rates`,
      {
        method: 'POST',
        body: JSON.stringify({
          recipient: params.recipient,
          items: params.items.map(item => ({
            catalog_variant_id: item.catalog_variant_id,
            quantity: item.quantity,
          })),
          currency: params.currency || 'USD',
        }),
      }
    );
    return result.result;
  }
}
