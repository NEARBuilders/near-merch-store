import { createPlugin } from 'every-plugin';
import { Effect } from 'every-plugin/effect';
import { z } from 'every-plugin/zod';
import { PaymentContract } from '../contract';
import { PingPayService } from './service';

export default createPlugin({
  variables: z.object({
    baseUrl: z.string().default('https://pay.pingpay.io'),
    recipientAddress: z.string().default('near-merch-store.near'),
  }),

  secrets: z.object({
    PING_API_KEY: z.string().optional(),
    PING_WEBHOOK_SECRET: z.string().optional(),
  }),

  contract: PaymentContract,

  initialize: (config) =>
    Effect.gen(function* () {
      const service = new PingPayService(
        config.variables.baseUrl,
        config.variables.recipientAddress,
        config.secrets.PING_WEBHOOK_SECRET,
        config.secrets.PING_API_KEY
      );

      console.log('[Ping Payment Plugin] Initialized successfully');
      if (config.secrets.PING_API_KEY) {
        console.log('[Ping Payment Plugin] API key configured');
      } else {
        console.warn('[Ping Payment Plugin] No API key configured - requests may fail');
      }
      if (config.secrets.PING_WEBHOOK_SECRET) {
        console.log('[Ping Payment Plugin] Webhook secret configured');
      } else {
        console.warn('[Ping Payment Plugin] No webhook secret configured - webhook verification will be skipped');
      }

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
        const timestamp = (input as { timestamp?: string }).timestamp || '';
        
        const result = await Effect.runPromise(
          service.verifyWebhook(input.body, input.signature, timestamp)
        );

        return {
          received: true,
          eventType: result.event.type,
          orderId: result.orderId,
        };
      }),

      getSession: builder.getSession.handler(async ({ input }) => {
        const session = await Effect.runPromise(service.getSession(input.sessionId));

        const metadata: Record<string, string> | undefined = session.metadata
          ? Object.fromEntries(
              Object.entries(session.metadata).map(([k, v]) => [k, String(v)])
            )
          : undefined;

        return {
          session: {
            id: session.id,
            status: session.status || 'unknown',
            paymentStatus: session.payment_status || 'unknown',
            amountTotal: session.amount_total ?? undefined,
            currency: session.currency ?? undefined,
            metadata,
          },
        };
      }),
    };
  },
});

export { PingPayService } from './service';
export type { PingWebhookEvent, PingWebhookResult } from './service';
