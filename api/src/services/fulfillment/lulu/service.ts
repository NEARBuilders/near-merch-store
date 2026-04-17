import { Effect, Schedule } from 'every-plugin/effect';
import crypto from 'crypto';
import type {
  CreateOrderInput,
  FulfillmentOrder,
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

function parseLuluApiError(error: unknown): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  const unsupportedDestinationMatch = errorMessage.match(
    /shipping.*not (available|supported|possible)|no shipping (options|rates)|cannot ship|destination not (supported|serviced)/i
  );
  if (unsupportedDestinationMatch) {
    return 'Shipping is not available to this destination';
  }
  
  const countryMatch = errorMessage.match(/country.*not (supported|valid|recognized)|invalid country/i);
  if (countryMatch) {
    return 'Shipping is not available to this destination';
  }
  
  const addressMatch = errorMessage.match(/invalid.*address|address.*not (valid|found|supported)/i);
  if (addressMatch) {
    return 'Shipping is not available to this destination';
  }
  
  return errorMessage;
}

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
    const downloads = book.downloadUrl
      ? [{
          url: book.downloadUrl,
          label: book.downloadLabel || 'Download for Free',
          kind: 'free' as const,
        }]
      : undefined;

    const format = book.variantName || 'Paperback';

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
          files: files?.map(f => ({ assetId: `lulu-${book.id}-${f.type}`, url: f.url || '', slot: f.type })),
          providerData: {
            sku: book.sku,
            podPackageId: book.podPackageId,
            pageCount: book.pageCount,
            coverPdfUrl: book.coverPdfUrl,
            interiorPdfUrl: book.interiorPdfUrl,
          },
        },
      ],
      metadata: downloads ? { downloads } : undefined,
      providerDetails: {
        lulu: {
          pageCount: book.pageCount,
          format,
        },
      },
    };
  }

  private getProviderData(item: { providerConfig: Record<string, unknown> }, index: number): LuluProviderData {
    const providerData = item.providerConfig as unknown as LuluProviderData | undefined;

    if (!providerData?.podPackageId || !providerData?.pageCount) {
      throw new FulfillmentError({
        message: `Missing required Lulu provider data for item ${index}`,
        code: 'INVALID_REQUEST',
        provider: 'lulu',
      });
    }

    return providerData;
  }

  private buildShippingOptionsAddress(recipient: CreateOrderInput['recipient']) {
    return {
      country: recipient.countryCode,
      city: recipient.city,
      postcode: recipient.zip,
      state_code: recipient.stateCode,
      street1: recipient.address1,
      street2: recipient.address2,
      name: recipient.name,
      organization: recipient.company,
      phone_number: recipient.phone,
    };
  }

  private buildCostCalculationAddress(recipient: CreateOrderInput['recipient']): LuluCostCalculationAddress {
    return {
      city: recipient.city,
      country_code: recipient.countryCode,
      email: recipient.email,
      is_business: Boolean(recipient.company),
      name: recipient.name,
      organization: recipient.company,
      phone_number: recipient.phone!,
      postcode: recipient.zip,
      state_code: recipient.stateCode,
      street1: recipient.address1,
      street2: recipient.address2,
    };
  }

  private buildPrintJobAddress(recipient: CreateOrderInput['recipient']) {
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

  createOrder(input: CreateOrderInput) {
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
            title: (item.providerConfig as any).title || `Item ${index + 1}`,
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
          throw new Error('Shipping is not available to this destination');
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
        throw new Error(parseLuluApiError(error));
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

  calculateTax(_input: any): Effect.Effect<{
    required: boolean;
    rate: number;
    shippingTaxable: boolean;
    exempt: boolean;
    taxAmount: number;
    vat: number;
  }, Error> {
    return Effect.succeed({
      required: false,
      rate: 0,
      shippingTaxable: false,
      exempt: true,
      taxAmount: 0,
      vat: 0,
    });
  }

  browseCatalog(_input: { limit?: number; offset?: number }) {
    const products = this.books.map(book => ({
      id: `lulu-${book.id}`,
      name: book.title,
      providerName: 'lulu',
      description: book.description ?? null,
      image: book.thumbnailUrl ?? null,
      slots: [
        { name: 'cover', label: 'Cover', required: true, acceptedFormats: ['application/pdf'] },
        { name: 'interior', label: 'Interior', required: true, acceptedFormats: ['application/pdf'] },
      ],
    }));
    return Effect.succeed({
      products,
      total: products.length,
    });
  }

  getCatalogProduct(input: { id: string }) {
    const bookId = input.id.replace('lulu-', '');
    const book = this.books.find(b => b.id === bookId);
    if (!book) return Effect.fail(new FulfillmentError({ message: `Book ${input.id} not found`, code: 'NOT_FOUND', provider: 'lulu' }));
    return Effect.succeed({
      product: {
        id: `lulu-${book.id}`,
        name: book.title,
        providerName: 'lulu',
        description: book.description ?? null,
        image: book.thumbnailUrl ?? null,
        slots: [
          { name: 'cover', label: 'Cover', required: true, acceptedFormats: ['application/pdf'] },
          { name: 'interior', label: 'Interior', required: true, acceptedFormats: ['application/pdf'] },
        ],
      },
    });
  }

  getCatalogProductVariants(_input: { id: string }) {
    return Effect.succeed({ variants: [] as any[] });
  }

  getVariantPrice(_input: { id: string }) {
    return Effect.succeed({ price: null as any });
  }

  generateMockups(_input: any) {
    return Effect.succeed({ status: 'unsupported' as const, images: [] });
  }

  getMockupResult(_taskId: string) {
    return Effect.succeed({ status: 'unsupported' as const, images: [] });
  }

  getPlacements(_input: { providerConfig: Record<string, unknown> }) {
    return Effect.succeed({
      placements: [
        { name: 'cover', label: 'Cover', required: true, acceptedFormats: ['pdf'] },
        { name: 'interior', label: 'Interior', required: true, acceptedFormats: ['pdf'] },
      ],
    });
  }

  ping() {
    return Effect.tryPromise({
      try: async () => {
        await this.client.ping();
        return {
          provider: 'lulu',
          status: 'ok' as const,
          timestamp: new Date().toISOString(),
        };
      },
      catch: (error) => new FulfillmentError({
        message: `Lulu connection test failed: ${error instanceof Error ? error.message : String(error)}`,
        code: 'SERVICE_UNAVAILABLE',
        provider: 'lulu',
        cause: error,
      }),
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
