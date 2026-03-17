import { Effect, Schedule } from 'every-plugin/effect';
import crypto from 'crypto';
import type {
  FulfillmentOrder,
  FulfillmentOrderInput,
  FulfillmentOrderItem,
  FulfillmentOrderStatus,
  ProviderProduct,
  ShippingQuoteInput,
  ShippingQuoteOutput,
} from '../schema';
import { FulfillmentError } from '../errors';
import { LuluClient } from './client';
import {
  LULU_STATUS_MAP,
  type LuluBookConfig,
  type LuluCostCalculationAddress,
  type LuluPrintJobRequest,
  type LuluPrintJobResponse,
  type LuluPrintJobStatus,
  type LuluProviderData,
  type LuluShippingOption,
  type LuluWebhookPayload,
} from './types';

interface LuluConfig {
  clientKey: string;
  clientSecret: string;
  baseUrl?: string;
  environment?: 'sandbox' | 'production';
  books?: LuluBookConfig[];
}

export class LuluService {
  private readonly client: LuluClient;
  private readonly books: LuluBookConfig[];

  constructor(private readonly config: LuluConfig) {
    this.client = new LuluClient(config);
    this.books = config.books || [];
  }

  private toProviderProduct(book: LuluBookConfig): ProviderProduct {
    const files = book.files.length > 0
      ? book.files
      : book.thumbnailUrl
        ? [{ type: 'preview', url: book.thumbnailUrl, previewUrl: book.thumbnailUrl }]
        : undefined;

    return {
      id: book.id,
      sourceId: book.id,
      name: book.title,
      description: book.description,
      thumbnailUrl: book.thumbnailUrl,
      variants: [
        {
          id: book.id,
          externalId: book.id,
          name: book.variantName,
          retailPrice: book.retailPrice,
          currency: book.currency,
          sku: book.sku,
          files,
          providerData: {
            sku: book.sku,
            podPackageId: book.podPackageId,
            pageCount: book.pageCount,
            coverPdfUrl: book.coverPdfUrl,
            interiorPdfUrl: book.interiorPdfUrl,
          },
        },
      ],
    };
  }

  private getProviderData(item: FulfillmentOrderItem, index: number): LuluProviderData {
    const providerData = item.providerData as LuluProviderData | undefined;

    if (!providerData?.podPackageId || !providerData?.pageCount) {
      throw new FulfillmentError({
        message: `Missing required Lulu provider data for item ${index}`,
        code: 'INVALID_REQUEST',
        provider: 'lulu',
      });
    }

    return providerData;
  }

  private buildShippingOptionsAddress(recipient: FulfillmentOrderInput['recipient']) {
    return {
      country: recipient.countryCode,
      city: recipient.city,
      postcode: recipient.zip,
      state: recipient.stateCode,
      state_code: recipient.stateCode,
      street1: recipient.address1,
      street2: recipient.address2,
      name: recipient.name,
      organization: recipient.company,
      phone_number: recipient.phone,
    };
  }

  private buildCostCalculationAddress(recipient: FulfillmentOrderInput['recipient']): LuluCostCalculationAddress {
    return {
      city: recipient.city,
      country_code: recipient.countryCode,
      email: recipient.email,
      is_business: Boolean(recipient.company),
      name: recipient.name,
      organization: recipient.company,
      phone_number: recipient.phone || '0000000000',
      postcode: recipient.zip,
      state_code: recipient.stateCode,
      street1: recipient.address1,
      street2: recipient.address2,
    };
  }

  private buildPrintJobAddress(recipient: FulfillmentOrderInput['recipient']) {
    return {
      city: recipient.city,
      country_code: recipient.countryCode,
      email: recipient.email,
      name: recipient.name,
      organization: recipient.company,
      phone_number: recipient.phone,
      postcode: recipient.zip,
      state_code: recipient.stateCode,
      street1: recipient.address1,
      street2: recipient.address2,
    };
  }

  private parseStatus(status: LuluPrintJobResponse['status']): LuluPrintJobStatus | null {
    const raw = typeof status === 'string' ? status : status?.name;
    if (!raw) return null;
    return raw in LULU_STATUS_MAP ? (raw as LuluPrintJobStatus) : null;
  }

  private selectRate(options: LuluShippingOption[]): LuluShippingOption | null {
    if (options.length === 0) return null;

    const withCost = options.filter((option) => Number.isFinite(parseFloat(option.cost_excl_tax || '')));
    if (withCost.length === 0) {
      return options[0] || null;
    }

    return withCost.reduce((cheapest, current) => {
      const cheapestCost = parseFloat(cheapest.cost_excl_tax || '0');
      const currentCost = parseFloat(current.cost_excl_tax || '0');
      return currentCost < cheapestCost ? current : cheapest;
    });
  }

  getProducts(options: { limit?: number; offset?: number } = {}) {
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;
    const books = this.books.slice(offset, offset + limit);

    return Effect.succeed({
      products: books.map((book) => this.toProviderProduct(book)),
      total: this.books.length,
    });
  }

  getProduct(id: string) {
    return Effect.try({
      try: () => {
        const book = this.books.find((entry) => entry.id === id);
        if (!book) {
          throw new Error(`Lulu product not found: ${id}`);
        }

        return { product: this.toProviderProduct(book) };
      },
      catch: (error) => new Error(error instanceof Error ? error.message : String(error)),
    });
  }

  createOrder(input: FulfillmentOrderInput) {
    return Effect.tryPromise({
      try: async () => {
        if (input.items.length === 0) {
          throw new FulfillmentError({
            message: 'Lulu order requires at least one item',
            code: 'INVALID_REQUEST',
            provider: 'lulu',
          });
        }

        const lineItems = input.items.map((item, index) => {
          const providerData = this.getProviderData(item, index);
          if (!providerData.coverPdfUrl || !providerData.interiorPdfUrl) {
            throw new FulfillmentError({
              message: `Missing Lulu PDF URLs for item ${index}`,
              code: 'INVALID_REQUEST',
              provider: 'lulu',
            });
          }

          return {
            external_id: `${input.externalId}-item-${index + 1}`,
            title: item.externalVariantId,
            quantity: item.quantity,
            printable_normalization: {
              cover: { source_url: providerData.coverPdfUrl },
              interior: { source_url: providerData.interiorPdfUrl },
              pod_package_id: providerData.podPackageId,
            },
          };
        });

        const firstProviderData = this.getProviderData(input.items[0]!, 0);
        const requestBody: LuluPrintJobRequest = {
          external_id: input.externalId,
          contact_email: input.recipient.email,
          shipping_level: firstProviderData.shippingLevel || 'MAIL',
          shipping_address: this.buildPrintJobAddress(input.recipient),
          line_items: lineItems,
        };

        const result = await this.client.createPrintJob(requestBody);
        const status = this.parseStatus(result.status);

        return {
          id: String(result.id),
          status: status ? LULU_STATUS_MAP[status] : 'pending',
        };
      },
      catch: (error) =>
        error instanceof FulfillmentError
          ? error
          : new FulfillmentError({
              message: `Failed to create Lulu order: ${error instanceof Error ? error.message : String(error)}`,
              code: 'UNKNOWN',
              provider: 'lulu',
              cause: error,
            }),
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
        const data = await this.client.getPrintJob(id);
        const status = this.parseStatus(data.status);
        const address = data.shipping_address || {};

        const order: FulfillmentOrder = {
          id: String(data.id),
          externalId: data.external_id,
          status: status ? LULU_STATUS_MAP[status] : 'pending',
          created: new Date(data.created_at).getTime(),
          updated: new Date(data.modified_at || data.updated_at || data.created_at).getTime(),
          recipient: {
            name: address.name || '',
            address1: address.street1 || '',
            address2: address.street2,
            city: address.city || '',
            stateCode: address.state_code,
            countryCode: address.country_code || '',
            zip: address.postcode || '',
            email: address.email || 'no-reply@example.com',
            phone: address.phone_number,
          },
          shipments:
            data.line_items
              ?.filter((item) => item.tracking_id)
              .map((item, index) => ({
                id: `${data.id}-${index + 1}`,
                carrier: item.carrier_name || 'Lulu',
                service: 'Standard',
                trackingNumber: item.tracking_id || '',
                trackingUrl: item.tracking_urls?.[0] || '',
                status: 'shipped',
              })) || undefined,
        };

        return { order };
      },
      catch: (error) =>
        error instanceof FulfillmentError
          ? error
          : new FulfillmentError({
              message: `Failed to get Lulu order: ${error instanceof Error ? error.message : String(error)}`,
              code: 'UNKNOWN',
              provider: 'lulu',
              cause: error,
            }),
    });
  }

  cancelOrder(orderId: string) {
    return Effect.tryPromise({
      try: async () => {
        await this.client.cancelPrintJob(orderId);
        return { id: orderId, status: 'cancelled' };
      },
      catch: (error) =>
        error instanceof FulfillmentError
          ? error
          : new FulfillmentError({
              message: `Failed to cancel Lulu order: ${error instanceof Error ? error.message : String(error)}`,
              code: 'UNKNOWN',
              provider: 'lulu',
              cause: error,
            }),
    });
  }

  quoteOrder(input: ShippingQuoteInput): Effect.Effect<ShippingQuoteOutput, Error> {
    return Effect.tryPromise({
      try: async () => {
        if (input.items.length === 0) {
          return { rates: [], currency: input.currency || 'USD' };
        }

        const lineItems = input.items.map((item, index) => {
          const providerData = this.getProviderData(item, index);
          return {
            quantity: item.quantity,
            page_count: providerData.pageCount,
            pod_package_id: providerData.podPackageId,
          };
        });

        const shippingOptions = await this.client.getShippingOptions({
          currency: input.currency || 'USD',
          line_items: lineItems,
          shipping_address: this.buildShippingOptionsAddress(input.recipient),
        });

        const selectedOption = this.selectRate(shippingOptions);
        if (!selectedOption) {
          return { rates: [], currency: input.currency || 'USD' };
        }

        const costCalculation = await this.client.calculatePrintJobCost({
          line_items: lineItems,
          shipping_address: this.buildCostCalculationAddress(input.recipient),
          shipping_option: selectedOption.level,
        });

        return {
          rates: [
            {
              id: selectedOption.level,
              name: selectedOption.level.replace(/_/g, ' '),
              rate: parseFloat(costCalculation.shipping_cost.total_cost_excl_tax),
              currency: costCalculation.currency,
              taxAmount: parseFloat(costCalculation.total_tax || '0'),
              vat: 0,
              minDeliveryDays: selectedOption.total_days_min,
              maxDeliveryDays: selectedOption.total_days_max,
              minDeliveryDate: selectedOption.min_delivery_date,
              maxDeliveryDate: selectedOption.max_delivery_date,
            },
          ],
          currency: costCalculation.currency,
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
      const { order } = yield* this.getOrder(orderId);
      return { id: orderId, status: order.status };
    });
  }

  calculateTax(_input: {
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
      if (!signature) return false;
      const calculatedSignature = crypto
        .createHmac('sha256', this.config.clientSecret)
        .update(body)
        .digest('hex');

      try {
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(calculatedSignature));
      } catch {
        return signature === calculatedSignature;
      }
    });
  }

  parseWebhookPayload(rawBody: string): { eventType: string; data: LuluPrintJobResponse } {
    const payload = JSON.parse(rawBody) as LuluWebhookPayload;
    return {
      eventType: payload.topic,
      data: payload.data,
    };
  }

  mapStatus(status: string): FulfillmentOrderStatus {
    return rawStatusToInternal(status);
  }

  ping() {
    return Effect.tryPromise({
      try: async () => {
        await this.client.ping();
        return {
          success: true,
          message: 'Connected to Lulu API',
          timestamp: new Date().toISOString(),
        } as const;
      },
      catch: (error) => {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Lulu connection test failed',
          timestamp: new Date().toISOString(),
        } as const;
      },
    });
  }

  configureWebhook(webhookUrl: string) {
    return Effect.tryPromise({
      try: async () => {
        const webhook = await this.client.createWebhook(webhookUrl);
        return {
          webhookUrl: webhook.url,
          enabledEvents: webhook.topics,
          publicKey: webhook.id,
          expiresAt: null,
        };
      },
      catch: (error) => new Error(`Failed to configure Lulu webhook: ${error instanceof Error ? error.message : String(error)}`),
    });
  }

  disableWebhooks(webhookUrl?: string | null) {
    return Effect.tryPromise({
      try: async () => {
        const webhooks = await this.client.listWebhooks();
        const matches = webhooks.filter((webhook) => !webhookUrl || webhook.url === webhookUrl);
        await Promise.all(matches.map((webhook) => this.client.deleteWebhook(webhook.id)));
      },
      catch: (error) => new Error(`Failed to disable Lulu webhooks: ${error instanceof Error ? error.message : String(error)}`),
    });
  }

  getWebhookConfig(webhookUrl?: string | null) {
    return Effect.tryPromise({
      try: async () => {
        const webhooks = await this.client.listWebhooks();
        const webhook = webhookUrl
          ? webhooks.find((entry) => entry.url === webhookUrl)
          : webhooks.find((entry) => entry.is_active);

        if (!webhook) {
          return null;
        }

        return {
          webhookUrl: webhook.url,
          enabledEvents: webhook.topics,
          publicKey: webhook.id,
        };
      },
      catch: (error) => new Error(`Failed to get Lulu webhook config: ${error instanceof Error ? error.message : String(error)}`),
    });
  }
}

function rawStatusToInternal(status: string): FulfillmentOrderStatus {
  return (LULU_STATUS_MAP[status as LuluPrintJobStatus] || 'pending') as FulfillmentOrderStatus;
}
