import { createPlugin } from 'every-plugin';
import { Effect } from 'every-plugin/effect';
import { z } from 'every-plugin/zod';
import { FulfillmentContract } from '../contract';
import { GelatoService } from './service';
import { ReturnAddressSchema } from '../../../schema';

export default createPlugin({
  variables: z.object({
    baseUrl: z.string().default('https://order.gelatoapis.com/v4'),
    returnAddress: ReturnAddressSchema.optional(),
  }),

  secrets: z.object({
    GELATO_API_KEY: z.string(),
    GELATO_WEBHOOK_SECRET: z.string(),
  }),

  contract: FulfillmentContract,

  initialize: (config) =>
    Effect.gen(function* () {
      const service = new GelatoService(
        config.secrets.GELATO_API_KEY,
        config.secrets.GELATO_WEBHOOK_SECRET,
        config.variables.returnAddress
      );

      console.log('[Gelato Plugin] Initialized successfully');

      return {
        service,
        webhookSecret: config.secrets.GELATO_WEBHOOK_SECRET,
      };
    }),

  shutdown: () => Effect.void,

  createRouter: (context, builder) => {
    const { service, webhookSecret } = context;

    return {
      ping: builder.ping.handler(async () => ({
        provider: 'gelato',
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
            service.verifyWebhookSignature(input.body, signature)
          );
          if (!isValid) {
            console.warn('[Gelato Webhook] Invalid signature');
          }
        }

        let event;
        try {
          event = JSON.parse(input.body);
        } catch {
          return { received: false, eventType: undefined };
        }

        console.log(`[Gelato Webhook] Received event: ${event.event}`);

        return {
          received: true,
          eventType: event.event,
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

export { GelatoService } from './service';
