import { createPlugin } from 'every-plugin';
import { Effect } from 'every-plugin/effect';
import { ORPCError } from 'every-plugin/orpc';
import { z } from 'every-plugin/zod';
import { FulfillmentContract } from '../contract';
import { FulfillmentError } from '../errors';
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
        const mapFulfillmentErrorToORPC = (error: Error) => {
          if (error instanceof FulfillmentError) {
            switch (error.code) {
              case 'RATE_LIMIT':
                return new ORPCError('TOO_MANY_REQUESTS', {
                  message: error.message,
                  data: { provider: error.provider, statusCode: error.statusCode },
                });
              case 'INVALID_ADDRESS':
              case 'INVALID_REQUEST':
                return new ORPCError('BAD_REQUEST', {
                  message: error.message,
                  data: { provider: error.provider, code: error.code },
                });
              case 'AUTHENTICATION_FAILED':
                return new ORPCError('UNAUTHORIZED', {
                  message: error.message,
                  data: { provider: error.provider },
                });
              case 'SERVICE_UNAVAILABLE':
                return new ORPCError('SERVICE_UNAVAILABLE', {
                  message: error.message,
                  data: { provider: error.provider },
                });
              case 'NO_RATES_AVAILABLE':
                return new ORPCError('NOT_FOUND', {
                  message: error.message,
                  data: { provider: error.provider },
                });
              default:
                return new ORPCError('INTERNAL_SERVER_ERROR', {
                  message: error.message,
                  data: { provider: error.provider },
                });
            }
          }
          return error;
        };

        return await Effect.runPromise(
          service.quoteOrder(input).pipe(
            Effect.mapError(mapFulfillmentErrorToORPC)
          )
        );
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
