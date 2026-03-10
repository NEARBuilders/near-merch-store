import {
  PrintfulClient as PrintfulSDK,
  CatalogItem,
  type Address,
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
  paging?: {
    total: number;
    offset: number;
    limit: number;
  };
}

interface PrintfulSyncProductsResult {
  sync_products: PrintfulSyncProduct[];
  paging: {
    total: number;
    offset: number;
    limit: number;
  };
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

  async getSyncProducts(limit = 20, offset = 0): Promise<PrintfulSyncProductsResult> {
    const result = await this.request<PrintfulResponse<PrintfulSyncProduct[]> & { result: PrintfulSyncProductsResult }>(
      `${this.v1BaseUrl}/store/products?limit=${limit}&offset=${offset}`
    );
    return {
      sync_products: result.result.sync_products || result.result as unknown as PrintfulSyncProduct[],
      paging: result.paging || { total: (result.result as any).length || 0, offset, limit },
    };
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

  async estimateOrder(params: {
    recipient: {
      country_code: string;
      zip: string;
      state_code?: string;
    };
    items: Array<{
      catalog_variant_id: number;
      quantity: number;
      designFiles?: Array<{ placement: string; url: string }>;
    }>;
    currency?: string;
  }): Promise<{
    subtotal: number;
    shipping: number;
    tax: number;
    vat: number;
    total: number;
    currency: string;
  }> {
    const orderItems = params.items.map(item => {
      const placements = (item.designFiles || []).map(df => ({
        placement: df.placement,
        technique: 'dtg' as const,
        layers: [{
          type: 'file' as const,
          url: df.url,
        }],
      }));
      
      return {
        source: CatalogItem.source.CATALOG,
        catalog_variant_id: item.catalog_variant_id,
        quantity: item.quantity,
        placements,
      };
    });
    
    const requestBody = {
      recipient: {
        country_code: params.recipient.country_code,
        zip: params.recipient.zip,
        state_code: params.recipient.state_code,
      },
      order_items: orderItems,
      retail_costs: params.currency ? { currency: params.currency } : undefined,
    };
    
    let result;
    try {
      result = await this.sdk.ordersV2.createOrderEstimationTask(this.storeId, requestBody);
    } catch (error) {
      console.error('[PrintfulClient] createOrderEstimationTask error:', error);
      if (error && typeof error === 'object') {
        console.error('[PrintfulClient] Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      }
      throw error;
    }

    const task = result.data as { id: string; status: string };
    
    const startTime = Date.now();
    const timeoutMs = 30000;
    
    while (Date.now() - startTime < timeoutMs) {
      const pollResult = await this.sdk.ordersV2.getOrderEstimationTask(task.id, this.storeId);
      const estimation = pollResult.data as {
        id: string;
        status: string;
        costs?: {
          subtotal: string;
          shipping: string;
          tax: string;
          vat: string;
          total: string;
          currency: string;
        };
        failure_reasons?: Array<{ message: string }>;
      };
      
      if (estimation.status === 'completed' && estimation.costs) {
        return {
          subtotal: parseFloat(estimation.costs.subtotal) || 0,
          shipping: parseFloat(estimation.costs.shipping) || 0,
          tax: parseFloat(estimation.costs.tax) || 0,
          vat: parseFloat(estimation.costs.vat) || 0,
          total: parseFloat(estimation.costs.total) || 0,
          currency: estimation.costs.currency || 'USD',
        };
      }
      
      if (estimation.status === 'failed') {
        throw new Error(`Order estimation failed: ${estimation.failure_reasons?.map(r => r.message).join(', ')}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    throw new Error('Order estimation timed out after 30 seconds');
  }
}
