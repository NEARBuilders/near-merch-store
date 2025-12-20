import { Effect } from 'every-plugin/effect';
import { OrderStore } from '../store/orders';
import type { MarketplaceRuntime } from '../runtime';

export interface CleanupResult {
  totalProcessed: number;
  cancelled: number;
  partiallyCancelled: number;
  failed: number;
  errors: Array<{ orderId: string; provider: string; error: string }>;
}

export const cleanupAbandonedDrafts = (
  runtime: MarketplaceRuntime,
  maxAgeHours = 24
) => Effect.gen(function* () {
  const orderStore = yield* OrderStore;
  console.log(`[CleanupJob] Starting cleanup of draft orders older than ${maxAgeHours} hours`);

  const abandonedOrders = yield* orderStore.findAbandonedDrafts(maxAgeHours);
  
  console.log(`[CleanupJob] Found ${abandonedOrders.length} abandoned draft orders`);

  if (abandonedOrders.length === 0) {
    return {
      totalProcessed: 0,
      cancelled: 0,
      partiallyCancelled: 0,
      failed: 0,
      errors: [],
    } as CleanupResult;
  }

  let cancelled = 0;
  let partiallyCancelled = 0;
  let failed = 0;
  const errors: Array<{ orderId: string; provider: string; error: string }> = [];

  for (const order of abandonedOrders) {
    console.log(`[CleanupJob] Processing order ${order.id}`);

    if (!order.draftOrderIds || Object.keys(order.draftOrderIds).length === 0) {
      console.log(`[CleanupJob] Order ${order.id} has no draft orders to cancel, marking as cancelled`);
      yield* orderStore.updateStatus(order.id, 'cancelled');
      cancelled++;
      continue;
    }

    const cancellationResults: Array<{ provider: string; success: boolean; error?: string }> = [];

    for (const [providerName, draftId] of Object.entries(order.draftOrderIds)) {
      const provider = runtime.getProvider(providerName);
      
      if (!provider) {
        console.error(`[CleanupJob] Provider ${providerName} not found for order ${order.id}`);
        cancellationResults.push({
          provider: providerName,
          success: false,
          error: 'Provider not found',
        });
        errors.push({
          orderId: order.id,
          provider: providerName,
          error: 'Provider not found',
        });
        continue;
      }

      const cancelResult = yield* Effect.tryPromise({
        try: () => provider.client.cancelOrder({ id: draftId }),
        catch: (e) => e instanceof Error ? e : new Error(String(e)),
      }).pipe(
        Effect.map(() => ({ provider: providerName, success: true })),
        Effect.catchAll((error) => Effect.succeed({
          provider: providerName,
          success: false,
          error: error.message,
        }))
      );

      if (cancelResult.success) {
        console.log(`[CleanupJob] Successfully cancelled draft ${draftId} at ${providerName} for order ${order.id}`);
      } else {
        const errorMessage = 'error' in cancelResult ? cancelResult.error : 'Unknown error';
        console.error(`[CleanupJob] Failed to cancel draft ${draftId} at ${providerName} for order ${order.id}:`, errorMessage);
        errors.push({
          orderId: order.id,
          provider: providerName,
          error: errorMessage,
        });
      }

      cancellationResults.push(cancelResult);
    }

    const allSucceeded = cancellationResults.every(r => r.success);
    const anySucceeded = cancellationResults.some(r => r.success);

    if (allSucceeded) {
      yield* orderStore.updateStatus(order.id, 'cancelled');
      cancelled++;
      console.log(`[CleanupJob] Order ${order.id} fully cancelled`);
    } else if (anySucceeded) {
      yield* orderStore.updateStatus(order.id, 'partially_cancelled');
      partiallyCancelled++;
      console.log(`[CleanupJob] Order ${order.id} partially cancelled`);
    } else {
      failed++;
      console.error(`[CleanupJob] Order ${order.id} failed to cancel at all providers`);
    }
  }

  const result: CleanupResult = {
    totalProcessed: abandonedOrders.length,
    cancelled,
    partiallyCancelled,
    failed,
    errors,
  };

  console.log(`[CleanupJob] Cleanup completed:`, result);

  return result;
});
