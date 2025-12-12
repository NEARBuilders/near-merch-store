import { oc } from 'every-plugin/orpc';
import { z } from 'every-plugin/zod';
import {
  ProviderProductSchema,
  FulfillmentOrderInputSchema,
  FulfillmentOrderSchema,
  MockupStyleSchema,
  MockupStyleInfoSchema,
  MockupTaskResultSchema,
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

  getMockupStyles: oc
    .route({ method: 'GET', path: '/mockup-styles/{productId}' })
    .input(z.object({ productId: z.coerce.number() }))
    .output(z.object({
      styles: z.array(MockupStyleInfoSchema),
    })),

  generateMockups: oc
    .route({ method: 'POST', path: '/mockups' })
    .input(z.object({
      productId: z.number(),
      variantIds: z.array(z.number()),
      files: z.array(z.object({
        placement: z.string(),
        imageUrl: z.string().url(),
      })),
      styles: z.array(MockupStyleSchema).default(['Lifestyle', 'Flat']),
      format: z.enum(['jpg', 'png']).default('jpg'),
    }))
    .output(z.object({ taskId: z.string() })),

  getMockupResult: oc
    .route({ method: 'GET', path: '/mockups/{taskId}' })
    .input(z.object({ taskId: z.string() }))
    .output(MockupTaskResultSchema),

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
});

export type FulfillmentContractType = typeof FulfillmentContract;
