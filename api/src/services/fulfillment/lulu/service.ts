import { Effect, Schedule } from 'every-plugin/effect';
import crypto from 'crypto';
import type {
  ProviderProduct,
  FulfillmentOrderInput,
  FulfillmentOrder,
  FulfillmentOrderStatus,
  ShippingQuoteInput,
  ShippingQuoteOutput,
  FulfillmentOrderItem,
} from '../schema';
import { FulfillmentError } from '../errors';
import {
  type LuluTokenResponse,
  type LuluPrintJobRequest,
  type LuluPrintJobResponse,
  type LuluShippingQuoteRequest,
  type LuluShippingQuoteResponse,
  type LuluWebhookPayload,
  type LuluAddress,
  LULU_STATUS_MAP,
  type LuluProviderData,
} from './types';

interface LuluConfig {
  clientKey: string;
  clientSecret: string;
  webhookSecret?: string;
  baseUrl?: string;
  environment?: 'sandbox' | 'production';
}

export class LuluService {
  private baseUrl: string;
  private authUrl: string;
  private clientKey: string;
  private clientSecret: string;
  private webhookSecret?: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private environment: 'sandbox' | 'production';

  constructor(config: LuluConfig) {
    this.clientKey = config.clientKey;
    this.clientSecret = config.clientSecret;
    this.webhookSecret = config.webhookSecret;
    this.environment = config.environment || 'sandbox';
    
    // Set URLs based on environment
    if (this.environment === 'production') {
      this.baseUrl = config.baseUrl || 'https://api.lulu.com';
      this.authUrl = 'https://api.lulu.com/auth/realms/glasstree/protocol/openid-connect/token';
    } else {
      this.baseUrl = config.baseUrl || 'https://api.sandbox.lulu.com';
      this.authUrl = 'https://api.sandbox.lulu.com/auth/realms/glasstree/protocol/openid-connect/token';
    }
  }

  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 5 minute buffer)
    if (this.accessToken && this.tokenExpiresAt > Date.now() + 300000) {
      return this.accessToken;
    }

    const response = await fetch(this.authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${this.clientKey}:${this.clientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new FulfillmentError({
        message: `Failed to obtain Lulu access token: ${response.status} - ${errorBody}`,
        code: 'AUTHENTICATION_FAILED',
        provider: 'lulu',
        statusCode: response.status,
      });
    }

    const data = (await response.json()) as LuluTokenResponse;
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);

    return this.accessToken;
  }

  private async makeRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const token = await this.getAccessToken();
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    return response;
  }

  getProducts(_options: { limit?: number; offset?: number } = {}) {
    return Effect.succeed({
      products: [] as ProviderProduct[],
      total: 0,
    });
  }

  getProduct(_id: string) {
    return Effect.fail(new Error('Lulu does not support product catalog API'));
  }

  private transformAddress(recipient: FulfillmentOrderInput['recipient']): LuluAddress {
    return {
      name: recipient.name,
      company: recipient.company,
      email: recipient.email,
      phone: recipient.phone,
      address_line_1: recipient.address1,
      address_line_2: recipient.address2,
      city: recipient.city,
      state_code: recipient.stateCode,
      country: recipient.countryCode,
      zip: recipient.zip,
    };
  }

  createOrder(input: FulfillmentOrderInput) {
    return Effect.tryPromise({
      try: async () => {
        const shippingAddress = this.transformAddress(input.recipient);

        // Process items - for Lulu, we expect providerData to contain SKU and PDF URLs
        const lineItems = input.items.map((item, index) => {
          const providerData = (item as FulfillmentOrderItem & { providerData?: LuluProviderData }).providerData;
          
          if (!providerData?.coverPdfUrl || !providerData?.interiorPdfUrl || !providerData?.podPackageId) {
            throw new FulfillmentError({
              message: `Missing required provider data for item ${index}. Need coverPdfUrl, interiorPdfUrl, and podPackageId.`,
              code: 'INVALID_REQUEST',
              provider: 'lulu',
            });
          }

          return {
            external_id: `${input.externalId}_item_${index}`,
            printable_normalization: {
              cover: {
                source_url: providerData.coverPdfUrl,
              },
              interior: {
                source_url: providerData.interiorPdfUrl,
              },
              pod_package_id: providerData.podPackageId,
            },
            quantity: item.quantity,
            shipping_address: shippingAddress,
          };
        });

        const requestBody: LuluPrintJobRequest = {
          external_id: input.externalId,
          line_items: lineItems,
          shipping_address: shippingAddress,
          email: input.recipient.email,
        };

        const response = await this.makeRequest('/print-jobs/', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new FulfillmentError({
            message: `Lulu print job creation failed: ${response.status} - ${errorBody}`,
            code: 'INVALID_REQUEST',
            provider: 'lulu',
            statusCode: response.status,
          });
        }

        const result = (await response.json()) as LuluPrintJobResponse;
        
        return {
          id: String(result.id),
          status: LULU_STATUS_MAP[result.status] || 'pending',
        };
      },
      catch: (error) => {
        if (error instanceof FulfillmentError) {
          return error;
        }
        return new FulfillmentError({
          message: `Failed to create Lulu order: ${error instanceof Error ? error.message : String(error)}`,
          code: 'UNKNOWN',
          provider: 'lulu',
          cause: error,
        });
      },
    }).pipe(
      Effect.retry({
        times: 2,
        schedule: Schedule.exponential('500 millis'),
        while: (error: unknown) => error instanceof FulfillmentError && error.code === 'RATE_LIMIT',
      })
    );
  }

  getOrder(id: string) {
    return Effect.tryPromise({
      try: async () => {
        const response = await this.makeRequest(`/print-jobs/${id}/`);

        if (!response.ok) {
          const errorBody = await response.text();
          if (response.status === 404) {
            throw new FulfillmentError({
              message: `Lulu order not found: ${id}`,
              code: 'UNKNOWN',
              provider: 'lulu',
              statusCode: 404,
            });
          }
          throw new FulfillmentError({
            message: `Failed to get Lulu order: ${response.status} - ${errorBody}`,
            code: 'UNKNOWN',
            provider: 'lulu',
            statusCode: response.status,
          });
        }

        const data = (await response.json()) as LuluPrintJobResponse;

        const order: FulfillmentOrder = {
          id: String(data.id),
          externalId: data.external_id,
          status: (LULU_STATUS_MAP[data.status] || 'pending') as FulfillmentOrderStatus,
          created: new Date(data.created_at).getTime(),
          updated: new Date(data.updated_at).getTime(),
          recipient: {
            name: data.shipping_address.name,
            address1: data.shipping_address.address_line_1,
            address2: data.shipping_address.address_line_2,
            city: data.shipping_address.city,
            stateCode: data.shipping_address.state_code,
            countryCode: data.shipping_address.country,
            zip: data.shipping_address.zip,
            email: data.shipping_address.email,
            phone: data.shipping_address.phone,
          },
          shipments: undefined,
        };

        return { order };
      },
      catch: (error) => {
        if (error instanceof FulfillmentError) {
          return error;
        }
        return new FulfillmentError({
          message: `Failed to get Lulu order: ${error instanceof Error ? error.message : String(error)}`,
          code: 'UNKNOWN',
          provider: 'lulu',
          cause: error,
        });
      },
    });
  }

  cancelOrder(orderId: string) {
    return Effect.tryPromise({
      try: async () => {
        const response = await this.makeRequest(`/print-jobs/${orderId}/`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorBody = await response.text();
          if (response.status === 404) {
            throw new FulfillmentError({
              message: `Lulu order not found: ${orderId}`,
              code: 'UNKNOWN',
              provider: 'lulu',
              statusCode: 404,
            });
          }
          if (response.status === 409) {
            throw new FulfillmentError({
              message: 'Order cannot be cancelled - already in manufacturing or shipped status',
              code: 'INVALID_REQUEST',
              provider: 'lulu',
              statusCode: 409,
            });
          }
          throw new FulfillmentError({
            message: `Failed to cancel Lulu order: ${response.status} - ${errorBody}`,
            code: 'UNKNOWN',
            provider: 'lulu',
            statusCode: response.status,
          });
        }

        return { id: orderId, status: 'cancelled' };
      },
      catch: (error) => {
        if (error instanceof FulfillmentError) {
          return error;
        }
        return new FulfillmentError({
          message: `Failed to cancel Lulu order: ${error instanceof Error ? error.message : String(error)}`,
          code: 'UNKNOWN',
          provider: 'lulu',
          cause: error,
        });
      },
    });
  }

  quoteOrder(input: ShippingQuoteInput): Effect.Effect<ShippingQuoteOutput, Error> {
    return Effect.tryPromise({
      try: async () => {
        if (input.items.length === 0) {
          return {
            rates: [],
            currency: input.currency || 'USD',
          };
        }

        // For Lulu, we need provider data on items for quoting
        const lineItems = input.items.map(item => {
          const providerData = (item as FulfillmentOrderItem & { providerData?: LuluProviderData }).providerData;
          return {
            quantity: item.quantity,
            page_count: providerData?.pageCount || 100, // Default to 100 pages
            pod_package_id: providerData?.podPackageId || '',
          };
        }).filter(item => item.pod_package_id);

        if (lineItems.length === 0) {
          return {
            rates: [],
            currency: input.currency || 'USD',
          };
        }

        const shippingAddress = this.transformAddress(input.recipient);

        const quoteRequest: LuluShippingQuoteRequest = {
          line_items: lineItems,
          shipping_address: shippingAddress,
        };

        const response = await this.makeRequest('/print-jobs/shipping-options/', {
          method: 'POST',
          body: JSON.stringify(quoteRequest),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new FulfillmentError({
            message: `Failed to get Lulu shipping quote: ${response.status} - ${errorBody}`,
            code: 'INVALID_REQUEST',
            provider: 'lulu',
            statusCode: response.status,
          });
        }

        const data = (await response.json()) as LuluShippingQuoteResponse;

        const rates = data.shipping_options.map(option => ({
          id: option.level,
          name: option.level.replace(/_/g, ' ').toUpperCase(),
          rate: parseFloat(option.total_cost_incl_tax),
          currency: data.currency,
        }));

        return {
          rates,
          currency: data.currency,
        };
      },
      catch: (error) => {
        if (error instanceof FulfillmentError) {
          throw error;
        }
        throw new Error(`Failed to quote Lulu order: ${error instanceof Error ? error.message : String(error)}`);
      },
    }).pipe(
      Effect.retry({
        times: 2,
        schedule: Schedule.exponential('500 millis'),
        while: (error: unknown) => error instanceof FulfillmentError && error.code === 'RATE_LIMIT',
      })
    );
  }

  confirmOrder(orderId: string) {
    return Effect.gen(this, function* () {
      // Lulu doesn't have a separate confirm step - orders are submitted immediately
      // But we'll verify the order exists and return the current status
      const { order } = yield* this.getOrder(orderId);
      
      return { id: orderId, status: order.status };
    });
  }

  calculateTax(input: {
    recipient: {
      countryCode: string;
      stateCode?: string;
      zip?: string;
      city?: string;
      taxId?: string;
    };
    items: Array<{
      catalogVariantId: number;
      quantity: number;
    }>;
    currency?: string;
  }): Effect.Effect<{
    required: boolean;
    rate: number;
    shippingTaxable: boolean;
    exempt: boolean;
  }, Error> {
    return Effect.succeed({
      required: false,
      rate: 0,
      shippingTaxable: false,
      exempt: true,
    });
  }

  verifyWebhookSignature(body: string, signature: string) {
    return Effect.sync(() => {
      if (!this.webhookSecret || !signature) return false;

      const hmac = crypto.createHmac('sha256', this.webhookSecret);
      hmac.update(body);
      const calculatedSignature = hmac.digest('hex');

      try {
        return crypto.timingSafeEqual(
          Buffer.from(signature),
          Buffer.from(calculatedSignature)
        );
      } catch {
        // If buffers have different lengths, fall back to string comparison
        return signature === calculatedSignature;
      }
    });
  }

  parseWebhookPayload(rawBody: string): { eventType: string; data: LuluWebhookPayload } {
    const payload = JSON.parse(rawBody) as LuluWebhookPayload;
    return {
      eventType: payload.type,
      data: payload,
    };
  }

  mapStatus(status: string): FulfillmentOrderStatus {
    return (LULU_STATUS_MAP[status] || 'pending') as FulfillmentOrderStatus;
  }

  ping() {
    return Effect.tryPromise({
      try: async () => {
        // Test authentication by fetching access token
        await this.getAccessToken();

        return {
          success: true,
          message: 'Connected to Lulu API',
          timestamp: new Date().toISOString(),
        } as { success: true; message: string; timestamp: string };
      },
      catch: (error) => {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Lulu connection test failed',
          timestamp: new Date().toISOString(),
        } as { success: false; message: string; timestamp: string };
      },
    });
  }
}
