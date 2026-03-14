import { createPlugin } from 'every-plugin';
import { Effect } from 'every-plugin/effect';
import { z } from 'every-plugin/zod';
import { FulfillmentContract } from '../contract';
import { LuluService } from './service';

export default createPlugin({
  variables: z.object({
    baseUrl: z.string().optional(),
    environment: z.enum(['sandbox', 'production']).default('sandbox'),
  }),

  secrets: z.object({
    LULU_CLIENT_KEY: z.string(),
    LULU_CLIENT_SECRET: z.string(),
    LULU_WEBHOOK_SECRET: z.string().optional(),
  }),

  contract: FulfillmentContract,

  initialize: (config) =>
    Effect.gen(function* () {
      const service = new LuluService({
        clientKey: config.secrets.LULU_CLIENT_KEY,
        clientSecret: config.secrets.LULU_CLIENT_SECRET,
        webhookSecret: config.secrets.LULU_WEBHOOK_SECRET,
        baseUrl: config.variables.baseUrl,
        environment: config.variables.environment,
      });

      console.log('[Lulu Plugin] Initialized successfully');

      return {
        service,
        webhookSecret: config.secrets.LULU_WEBHOOK_SECRET,
      };
    }),

  shutdown: () => Effect.void,

  createRouter: (context, builder) => {
    const { service } = context;

    return {
      ping: builder.ping.handler(async () => {
        const result = await Effect.runPromise(service.ping());
        if (!result.success) {
          throw new Error(result.message || 'Lulu connection failed');
        }
        return {
          provider: 'lulu',
          status: 'ok' as const,
          timestamp: result.timestamp,
        };
      }),

      getProducts: builder.getProducts.handler(async ({ input }) => {
        return await Effect.runPromise(service.getProducts(input));
      }),

      getProduct: builder.getProduct.handler(async ({ input }) => {
        return await Effect.runPromise(service.getProduct(input.id));
      }),

      createOrder: builder.createOrder.handler(async ({ input }) => {
        return await Effect.runPromise(service.createOrder(input));
      }),

      getOrder: builder.getOrder.handler(async ({ input }) => {
        return await Effect.runPromise(service.getOrder(input.id));
      }),

      quoteOrder: builder.quoteOrder.handler(async ({ input }) => {
        return await Effect.runPromise(service.quoteOrder(input));
      }),

      calculateTax: builder.calculateTax.handler(async ({ input }) => {
        return await Effect.runPromise(service.calculateTax(input));
      }),

      confirmOrder: builder.confirmOrder.handler(async ({ input }) => {
        return await Effect.runPromise(service.confirmOrder(input.id));
      }),

      cancelOrder: builder.cancelOrder.handler(async ({ input }) => {
        return await Effect.runPromise(service.cancelOrder(input.id));
      }),
    };
  },
});

export { LuluService } from './service';
