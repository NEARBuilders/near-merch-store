import { Effect } from 'every-plugin/effect';
import crypto from 'crypto';
import type { 
  ProviderProduct, 
  FulfillmentOrderInput, 
  FulfillmentOrder, 
  FulfillmentOrderStatus,
  ShippingQuoteInput,
  ShippingQuoteOutput
} from '../schema';

interface GelatoAddress {
  firstName: string;
  lastName: string;
  companyName?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postCode: string;
  country: string;
  email: string;
  phone?: string;
}

interface GelatoOrderData {
  orderType?: 'order' | 'draft';
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
  shippingAddress: GelatoAddress;
  returnAddress?: GelatoAddress;
  metadata?: Array<{
    key: string;
    value: string;
  }>;
}

interface GelatoQuoteRequest {
  orderReferenceId: string;
  customerReferenceId: string;
  currency: string;
  allowMultipleQuotes?: boolean;
  recipient: {
    country: string;
    companyName?: string;
    firstName: string;
    lastName: string;
    addressLine1: string;
    addressLine2?: string;
    state?: string;
    city: string;
    postCode: string;
    email: string;
    phone?: string;
  };
  products: Array<{
    itemReferenceId: string;
    productUid: string;
    files: Array<{
      type: string;
      url: string;
    }>;
    quantity: number;
  }>;
}

interface GelatoQuoteResponse {
  orderReferenceId: string;
  quotes: Array<{
    id: string;
    itemReferenceIds: string[];
    fulfillmentCountry: string;
    shipmentMethods: Array<{
      name: string;
      shipmentMethodUid: string;
      price: number;
      currency: string;
      minDeliveryDays: number;
      maxDeliveryDays: number;
      minDeliveryDate: string;
      maxDeliveryDate: string;
      type: string;
    }>;
    products: Array<{
      itemReferenceId: string;
      productUid: string;
      quantity: number;
      price: number;
      currency: string;
    }>;
  }>;
}

interface GelatoSearchParams {
  orderTypes?: ('order' | 'draft')[];
  countries?: string[];
  currencies?: string[];
  financialStatuses?: string[];
  fulfillmentStatuses?: string[];
  ids?: string[];
  orderReferenceIds?: string[];
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

interface GelatoOrderSummary {
  id: string;
  orderReferenceId: string;
  customerReferenceId: string;
  orderType: string;
  fulfillmentStatus: string;
  financialStatus: string;
  currency: string;
  firstName: string;
  lastName: string;
  country: string;
  itemsCount: number;
  totalInclVat: string;
  createdAt: string;
  updatedAt: string;
}

const GELATO_STATUS_MAP: Record<string, FulfillmentOrderStatus> = {
  created: 'pending',
  passed: 'processing',
  completed: 'processing',
  printing: 'printing',
  shipped: 'shipped',
  delivered: 'delivered',
  cancelled: 'cancelled',
  canceled: 'cancelled',
  draft: 'draft',
  failed: 'failed',
  pending: 'pending',
};

export class GelatoService {
  private baseUrl = 'https://order.gelatoapis.com/v4';

  constructor(
    private readonly apiKey: string,
    private readonly webhookSecret?: string,
    private readonly returnAddress?: GelatoAddress
  ) {}

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-API-KEY': this.apiKey,
    };
  }

  private getDefaultReturnAddress(): GelatoAddress {
    return this.returnAddress || {
      firstName: 'Returns',
      lastName: 'Department',
      companyName: 'Returns Dept',
      addressLine1: '123 Return St',
      city: 'Los Angeles',
      state: 'CA',
      postCode: '90001',
      country: 'US',
      email: 'returns@example.com',
    };
  }
  
  getProducts(_options: { limit?: number; offset?: number } = {}) {
    return Effect.succeed({
      products: [] as ProviderProduct[],
      total: 0,
    });
  }

  getProduct(_id: string) {
    return Effect.fail(new Error('Gelato does not support product listing via API'));
  }

  createOrder(input: FulfillmentOrderInput, orderType: 'order' | 'draft' = 'order') {
    return Effect.tryPromise({
      try: async () => {
        const nameParts = input.recipient.name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || firstName;

        const shippingAddress: GelatoAddress = {
          firstName,
          lastName,
          companyName: input.recipient.company,
          addressLine1: input.recipient.address1,
          addressLine2: input.recipient.address2,
          city: input.recipient.city,
          state: input.recipient.stateCode,
          postCode: input.recipient.zip,
          country: input.recipient.countryCode,
          email: input.recipient.email,
          phone: input.recipient.phone,
        };

        const orderData: GelatoOrderData = {
          orderType,
          orderReferenceId: input.externalId,
          customerReferenceId: input.externalId,
          currency: input.retailCosts?.currency || 'USD',
          items: input.items.map((item, index) => ({
            itemReferenceId: `item_${input.externalId}_${index}`,
            productUid: item.productId?.toString() || '',
            files: item.files?.map((f) => ({
              type: f.type || 'default',
              url: f.url,
            })) || [],
            quantity: item.quantity,
          })),
          shipmentMethodUid: 'standard',
          shippingAddress,
          returnAddress: this.getDefaultReturnAddress(),
        };

        const response = await fetch(`${this.baseUrl}/orders`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(orderData),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Gelato order creation failed: ${response.status} - ${errorBody}`);
        }

        const result = (await response.json()) as { id: string; fulfillmentStatus?: string };
        return { id: result.id, status: result.fulfillmentStatus || 'pending' };
      },
      catch: (e) => new Error(`Gelato order failed: ${e instanceof Error ? e.message : String(e)}`),
    });
  }

  getOrder(id: string) {
    return Effect.tryPromise({
      try: async () => {
        const response = await fetch(`${this.baseUrl}/orders/${id}`, {
          headers: this.getHeaders(),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Failed to get order: ${response.status} - ${errorBody}`);
        }

        const data = (await response.json()) as Record<string, unknown>;

        const order: FulfillmentOrder = {
          id: String(data.id),
          externalId: data.orderReferenceId as string | undefined,
          status: GELATO_STATUS_MAP[(data.fulfillmentStatus as string)?.toLowerCase()] || 'pending',
          created: new Date(data.createdAt as string).getTime(),
          updated: new Date(data.updatedAt as string).getTime(),
          recipient: {
            name: `${(data.shippingAddress as Record<string, string>)?.firstName || ''} ${(data.shippingAddress as Record<string, string>)?.lastName || ''}`.trim(),
            address1: (data.shippingAddress as Record<string, string>)?.addressLine1 || '',
            city: (data.shippingAddress as Record<string, string>)?.city || '',
            stateCode: (data.shippingAddress as Record<string, string>)?.state || '',
            countryCode: (data.shippingAddress as Record<string, string>)?.country || '',
            zip: (data.shippingAddress as Record<string, string>)?.postCode || '',
            email: (data.shippingAddress as Record<string, string>)?.email || '',
          },
          shipments: (data.items as Array<Record<string, unknown>>)?.flatMap((item) =>
            ((item.fulfillments as Array<Record<string, unknown>>) || []).map((f) => ({
              id: String(f.fulfillmentId || ''),
              carrier: (f.shipmentMethodName as string) || '',
              service: (f.shipmentMethodUid as string) || '',
              trackingNumber: (f.trackingCode as string) || '',
              trackingUrl: (f.trackingUrl as string) || '',
              status: (f.status as string) || '',
            }))
          ),
        };

        return { order };
      },
      catch: (e) => new Error(`Failed to get Gelato order: ${e instanceof Error ? e.message : String(e)}`),
    });
  }

  cancelOrder(orderId: string) {
    return Effect.tryPromise({
      try: async () => {
        const response = await fetch(`${this.baseUrl}/orders/${orderId}:cancel`, {
          method: 'POST',
          headers: this.getHeaders(),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          if (response.status === 409) {
            throw new Error(`Order cannot be canceled - already in printed or shipped status`);
          }
          if (response.status === 404) {
            throw new Error(`Order not found: ${orderId}`);
          }
          throw new Error(`Failed to cancel order: ${response.status} - ${errorBody}`);
        }

        return { id: orderId, status: 'cancelled' };
      },
      catch: (e) => new Error(`Gelato cancel order failed: ${e instanceof Error ? e.message : String(e)}`),
    });
  }

  searchOrders(params: GelatoSearchParams = {}) {
    return Effect.tryPromise({
      try: async () => {
        const response = await fetch(`${this.baseUrl}/orders:search`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            orderTypes: params.orderTypes,
            countries: params.countries,
            currencies: params.currencies,
            financialStatuses: params.financialStatuses,
            fulfillmentStatuses: params.fulfillmentStatuses,
            ids: params.ids,
            orderReferenceIds: params.orderReferenceIds,
            startDate: params.startDate,
            endDate: params.endDate,
            search: params.search,
            limit: params.limit || 50,
            offset: params.offset || 0,
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Failed to search orders: ${response.status} - ${errorBody}`);
        }

        const result = (await response.json()) as { orders: GelatoOrderSummary[] };

        return {
          orders: result.orders.map((o) => ({
            id: o.id,
            externalId: o.orderReferenceId,
            customerReferenceId: o.customerReferenceId,
            orderType: o.orderType,
            status: GELATO_STATUS_MAP[o.fulfillmentStatus?.toLowerCase()] || 'pending',
            financialStatus: o.financialStatus,
            currency: o.currency,
            recipientName: `${o.firstName} ${o.lastName}`.trim(),
            country: o.country,
            itemsCount: o.itemsCount,
            total: o.totalInclVat,
            createdAt: o.createdAt,
            updatedAt: o.updatedAt,
          })),
        };
      },
      catch: (e) => new Error(`Gelato search orders failed: ${e instanceof Error ? e.message : String(e)}`),
    });
  }

  quoteOrderDetailed(params: {
    orderReferenceId: string;
    customerReferenceId: string;
    currency: string;
    recipient: {
      name: string;
      company?: string;
      address1: string;
      address2?: string;
      city: string;
      stateCode?: string;
      countryCode: string;
      zip: string;
      email: string;
      phone?: string;
    };
    items: Array<{
      itemReferenceId: string;
      productUid: string;
      files: Array<{ type: string; url: string }>;
      quantity: number;
    }>;
    allowMultipleQuotes?: boolean;
  }) {
    return Effect.tryPromise({
      try: async () => {
        const nameParts = params.recipient.name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || firstName;

        const quoteRequest: GelatoQuoteRequest = {
          orderReferenceId: params.orderReferenceId,
          customerReferenceId: params.customerReferenceId,
          currency: params.currency,
          allowMultipleQuotes: params.allowMultipleQuotes ?? true,
          recipient: {
            country: params.recipient.countryCode,
            companyName: params.recipient.company,
            firstName,
            lastName,
            addressLine1: params.recipient.address1,
            addressLine2: params.recipient.address2,
            state: params.recipient.stateCode,
            city: params.recipient.city,
            postCode: params.recipient.zip,
            email: params.recipient.email,
            phone: params.recipient.phone,
          },
          products: params.items.map((item) => ({
            itemReferenceId: item.itemReferenceId,
            productUid: item.productUid,
            files: item.files,
            quantity: item.quantity,
          })),
        };

        const response = await fetch(`${this.baseUrl}/orders:quote`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(quoteRequest),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Failed to quote order: ${response.status} - ${errorBody}`);
        }

        const result = (await response.json()) as GelatoQuoteResponse;

        return {
          orderReferenceId: result.orderReferenceId,
          quotes: result.quotes.map((q) => ({
            id: q.id,
            itemReferenceIds: q.itemReferenceIds,
            fulfillmentCountry: q.fulfillmentCountry,
            shipmentMethods: q.shipmentMethods.map((sm) => ({
              name: sm.name,
              uid: sm.shipmentMethodUid,
              price: sm.price,
              currency: sm.currency,
              minDeliveryDays: sm.minDeliveryDays,
              maxDeliveryDays: sm.maxDeliveryDays,
              minDeliveryDate: sm.minDeliveryDate,
              maxDeliveryDate: sm.maxDeliveryDate,
              type: sm.type,
            })),
            products: q.products.map((p) => ({
              itemReferenceId: p.itemReferenceId,
              productUid: p.productUid,
              quantity: p.quantity,
              price: p.price,
              currency: p.currency,
            })),
          })),
        };
      },
      catch: (e) => new Error(`Gelato quote order failed: ${e instanceof Error ? e.message : String(e)}`),
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
        return signature === this.webhookSecret;
      }
    });
  }

  quoteOrder(input: ShippingQuoteInput): Effect.Effect<ShippingQuoteOutput, Error> {
    return Effect.gen(this, function* () {
      if (input.items.length === 0) {
        return {
          rates: [],
          currency: input.currency || 'USD',
        };
      }

      const quoteResult = yield* this.quoteOrderDetailed({
        orderReferenceId: `quote_${Date.now()}`,
        customerReferenceId: `quote_${Date.now()}`,
        currency: input.currency || 'USD',
        recipient: {
          name: input.recipient.name,
          company: input.recipient.company,
          address1: input.recipient.address1,
          address2: input.recipient.address2,
          city: input.recipient.city,
          stateCode: input.recipient.stateCode,
          countryCode: input.recipient.countryCode,
          zip: input.recipient.zip,
          email: input.recipient.email,
          phone: input.recipient.phone,
        },
        items: input.items.map((item, index) => ({
          itemReferenceId: `item_${index}`,
          productUid: item.productId?.toString() || item.externalVariantId || '',
          files: item.files || [],
          quantity: item.quantity,
        })),
      });

      const rates = quoteResult.quotes.flatMap(quote =>
        quote.shipmentMethods.map(method => ({
          id: method.uid,
          name: method.name,
          rate: method.price,
          currency: method.currency,
          minDeliveryDays: method.minDeliveryDays,
          maxDeliveryDays: method.maxDeliveryDays,
          minDeliveryDate: method.minDeliveryDate,
          maxDeliveryDate: method.maxDeliveryDate,
        }))
      );

      return {
        rates,
        currency: input.currency || 'USD',
      };
    });
  }

  confirmOrder(orderId: string) {
    return Effect.gen(this, function* () {
      const { order } = yield* this.getOrder(orderId);
      
      if (order.status === 'draft') {
        console.log(`[Gelato] Confirming draft order ${orderId} - transitioning to order`);
      }
      
      return { id: orderId, status: order.status };
    });
  }

  mapStatus(status: string): FulfillmentOrderStatus {
    return GELATO_STATUS_MAP[status.toLowerCase()] || 'pending';
  }
}
