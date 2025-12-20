import { createPlugin } from 'every-plugin';
import { Effect } from 'every-plugin/effect';
import { z } from 'every-plugin/zod';
import { PaymentContract } from '../contract';
import { PingPayService } from './service';

export default createPlugin({
  variables: z.object({
    baseUrl: z.string().default('https://pay.pingpay.io'),
    recipientAddress: z.string().default('yourstore.near'),
    recipientChainId: z.string().default('near:mainnet'),
  }),

  secrets: z.object({}),

  contract: PaymentContract,

  initialize: (config) =>
    Effect.gen(function* () {
      const service = new PingPayService(
        config.variables.baseUrl,
        config.variables.recipientAddress,
        config.variables.recipientChainId
      );

      console.log('[Ping Payment Plugin] Initialized successfully');

      return {
        service,
      };
    }),

  shutdown: () => Effect.void,

  createRouter: (context, builder) => {
    const { service } = context;

    return {
      ping: builder.ping.handler(async () => ({
        provider: 'pingpay',
        status: 'ok' as const,
        timestamp: new Date().toISOString(),
      })),

      createCheckout: builder.createCheckout.handler(async ({ input }) => {
        return await Effect.runPromise(service.createCheckout(input));
      }),

      verifyWebhook: builder.verifyWebhook.handler(async ({ input }) => {
        const result = await Effect.runPromise(
          service.verifyWebhook(input.body, input.signature)
        );

        return {
          received: true,
          eventType: result.event.type,
          orderId: result.orderId,
        };
      }),

      getSession: builder.getSession.handler(async ({ input }) => {
        const session = await Effect.runPromise(service.getSession(input.sessionId));

        return {
          session: {
            id: session.id,
            status: session.status || 'unknown',
            paymentStatus: session.payment_status || 'unknown',
            amountTotal: session.amount_total ?? undefined,
            currency: session.currency ?? undefined,
            metadata: session.metadata ?? undefined,
          },
        };
      }),
    };
  },
});

export { PingPayService } from './service';
