import { createPlugin } from 'every-plugin';
import { Effect } from 'every-plugin/effect';
import { z } from 'every-plugin/zod';
import { PaymentContract } from '../contract';
import { StripePaymentService } from './service';

export default createPlugin({
  variables: z.object({
    baseUrl: z.string().optional(),
  }),

  secrets: z.object({
    STRIPE_SECRET_KEY: z.string(),
    STRIPE_WEBHOOK_SECRET: z.string(),
  }),

  contract: PaymentContract,

  initialize: (config) =>
    Effect.gen(function* () {
      const service = new StripePaymentService(
        config.secrets.STRIPE_SECRET_KEY,
        config.secrets.STRIPE_WEBHOOK_SECRET
      );

      console.log('[Stripe Payment Plugin] Initialized successfully');

      return {
        service,
      };
    }),

  shutdown: () => Effect.void,

  createRouter: (context, builder) => {
    const { service } = context;

    return {
      ping: builder.ping.handler(async () => ({
        provider: 'stripe',
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

export { StripePaymentService } from './service';
