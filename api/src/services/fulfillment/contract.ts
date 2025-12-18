import { oc } from 'every-plugin/orpc';
import { z } from 'every-plugin/zod';
import {
  ProviderProductSchema,
  FulfillmentOrderInputSchema,
  FulfillmentOrderSchema,
  ShippingQuoteInputSchema,
  ShippingQuoteOutputSchema,
} from './schema';

export const FulfillmentContract = oc.router({
  ping: oc
    .route({ method: 'GET', path: '/ping' })
    .output(z.object({
      provider: z.string(),
      status: z.literal('ok'),
      timestamp: z.string().datetime(),
    })),

  getProducts: oc
    .route({ method: 'GET', path: '/products' })
    .input(z.object({
      limit: z.number().int().positive().max(100).default(50),
      offset: z.number().int().min(0).default(0),
    }))
    .output(z.object({
      products: z.array(ProviderProductSchema),
      total: z.number(),
    })),

  getProduct: oc
    .route({ method: 'GET', path: '/products/{id}' })
    .input(z.object({ id: z.string() }))
    .output(z.object({ product: ProviderProductSchema })),

  createOrder: oc
    .route({ method: 'POST', path: '/orders' })
    .input(FulfillmentOrderInputSchema)
    .output(z.object({
      id: z.string(),
      status: z.string(),
    })),

  getOrder: oc
    .route({ method: 'GET', path: '/orders/{id}' })
    .input(z.object({ id: z.string() }))
    .output(z.object({ order: FulfillmentOrderSchema })),

  webhook: oc
    .route({ method: 'POST', path: '/webhook' })
    .input(z.object({
      body: z.string(),
      signature: z.string().optional(),
    }))
    .output(z.object({
      received: z.boolean(),
      eventType: z.string().optional(),
    })),

  quoteOrder: oc
    .route({ method: 'POST', path: '/orders/quote' })
    .input(ShippingQuoteInputSchema)
    .output(ShippingQuoteOutputSchema),

  confirmOrder: oc
    .route({ method: 'POST', path: '/orders/{id}/confirm' })
    .input(z.object({ id: z.string() }))
    .output(z.object({
      id: z.string(),
      status: z.string(),
    })),

  cancelOrder: oc
    .route({ method: 'POST', path: '/orders/{id}/cancel' })
    .input(z.object({ id: z.string() }))
    .output(z.object({
      id: z.string(),
      status: z.string(),
    })),
});

export type FulfillmentContractType = typeof FulfillmentContract;
