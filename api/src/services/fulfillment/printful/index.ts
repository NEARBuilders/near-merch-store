import { createPlugin } from 'every-plugin';
import { Effect } from 'every-plugin/effect';
import { z } from 'every-plugin/zod';
import { FulfillmentContract } from '../contract';
import { PrintfulService } from './service';

export default createPlugin({
  variables: z.object({
    baseUrl: z.string().default('https://api.printful.com'),
  }),

  secrets: z.object({
    PRINTFUL_API_KEY: z.string(),
    PRINTFUL_STORE_ID: z.string(),
    PRINTFUL_WEBHOOK_SECRET: z.string().optional(),
  }),

  contract: FulfillmentContract,

  initialize: (config) =>
    Effect.gen(function* () {
      const service = new PrintfulService(
        config.secrets.PRINTFUL_API_KEY,
        config.secrets.PRINTFUL_STORE_ID,
        config.variables.baseUrl
      );

      console.log('[Printful Plugin] Initialized successfully');

      return {
        service,
        webhookSecret: config.secrets.PRINTFUL_WEBHOOK_SECRET,
      };
    }),

  shutdown: () => Effect.void,

  createRouter: (context, builder) => {
    const { service, webhookSecret } = context;

    return {
      ping: builder.ping.handler(async () => ({
        provider: 'printful',
        status: 'ok' as const,
        timestamp: new Date().toISOString(),
      })),

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

      webhook: builder.webhook.handler(async ({ input }) => {
        const signature = input.signature || '';

        if (webhookSecret && signature) {
          const isValid = Effect.runSync(
            service.verifyWebhookSignature(input.body, signature, webhookSecret)
          );
          if (!isValid) {
            console.warn('[Printful Webhook] Invalid signature');
          }
        }

        let event;
        try {
          event = JSON.parse(input.body);
        } catch {
          return { received: false, eventType: undefined };
        }

        console.log(`[Printful Webhook] Received event: ${event.type}`);

        return {
          received: true,
          eventType: event.type,
        };
      }),

      quoteOrder: builder.quoteOrder.handler(async ({ input }) => {
        return await Effect.runPromise(service.quoteOrder(input));
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

export { PrintfulService } from './service';
