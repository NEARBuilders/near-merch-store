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
    const result = await this.sdk.ordersV2.createOrder(this.storeId, orderInput);
    return result.data as Order;
  }

  async confirmOrder(orderId: number): Promise<void> {
    await this.sdk.ordersV2.confirmOrder(String(orderId), this.storeId);
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
}
