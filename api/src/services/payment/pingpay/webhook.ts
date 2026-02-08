import { Effect, Schedule } from 'every-plugin/effect';
import type { MarketplaceRuntime, PaymentProvider } from '../../../runtime';
import type { OrderStatus } from '../../../schema';
import { OrderStore } from '../../../store/orders';

export function handlePingPayWebhookEffect(options: {
  runtime: MarketplaceRuntime;
  pingProvider: PaymentProvider;
  signature: string;
  timestamp: string;
  body: string;
}): Effect.Effect<{ received: true }, Error, OrderStore> {
  const { runtime, pingProvider, signature, timestamp, body } = options;

  return Effect.gen(function* () {
    const webhookResult = yield* Effect.tryPromise({
      try: async () =>
        pingProvider.client.verifyWebhook({
          body,
          signature,
          timestamp,
        }),
      catch: (error) =>
        new Error(
          `Webhook verification failed: ${error instanceof Error ? error.message : String(error)}`
        ),
    });

    const eventType = webhookResult.eventType;
    const { orderId, sessionId } = webhookResult;

    const store = yield* OrderStore;

    let order = orderId ? yield* store.find(orderId) : null;
    if (!order && sessionId) {
      order = yield* store.findByCheckoutSession(sessionId);
    }

    if (!order) {
      return { received: true } as const;
    }

    const resolvedOrderId = order.id;
    const draftOrderIds = order.draftOrderIds || {};

    switch (eventType) {
      case 'payment.success':
      case 'checkout.session.completed': {
        if (order.status !== 'draft_created' && order.status !== 'pending' && order.status !== 'payment_pending') {
          return { received: true } as const;
        }

        yield* store.updateStatus(resolvedOrderId, 'paid');

        if (Object.keys(draftOrderIds).length === 0) {
          return { received: true } as const;
        }

        const confirmationResults: Record<string, { success: boolean; error?: string }> = {};

        for (const [providerName, draftId] of Object.entries(draftOrderIds)) {
          if (providerName === 'manual') {
            confirmationResults[providerName] = { success: true };
            continue;
          }

          const provider = runtime.getProvider(providerName);
          if (!provider) {
            confirmationResults[providerName] = { success: false, error: 'Provider not configured' };
            continue;
          }

          const confirmEffect = Effect.tryPromise({
            try: () => provider.client.confirmOrder({ id: draftId as string }),
            catch: (error) =>
              new Error(
                `Failed to confirm order at ${providerName}: ${
                  error instanceof Error ? error.message : String(error)
                }`
              ),
          }).pipe(Effect.retry({ times: 3, schedule: Schedule.exponential('100 millis') }));

          const result = yield* confirmEffect.pipe(
            Effect.map(() => ({ success: true } as const)),
            Effect.catchAll((error) => Effect.succeed({ success: false as const, error: error.message }))
          );

          confirmationResults[providerName] = result;
        }

        const allSuccess = Object.values(confirmationResults).every((r) => r.success);
        const finalStatus: OrderStatus = allSuccess ? 'processing' : 'paid_pending_fulfillment';
        yield* store.updateStatus(resolvedOrderId, finalStatus);
        break;
      }

      case 'payment.failed':
        yield* store.updateStatus(resolvedOrderId, 'payment_failed');
        break;

      default:
        break;
    }

    return { received: true } as const;
  });
}
