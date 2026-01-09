import { createPlugin } from 'every-plugin';
import { Effect, Layer, Schedule } from 'every-plugin/effect';
import { ORPCError } from 'every-plugin/orpc';
import { z } from 'every-plugin/zod';
import { contract } from './contract';
import { cleanupAbandonedDrafts } from './jobs/cleanup-drafts';
import { createMarketplaceRuntime } from './runtime';
import { ReturnAddressSchema, type OrderStatus, type TrackingInfo } from './schema';
import { CheckoutService, CheckoutServiceLive } from './services/checkout';
import { ProductService, ProductServiceLive } from './services/products';
import { StripeService } from './services/stripe';
import { DatabaseLive, OrderStore, OrderStoreLive, ProductStoreLive } from './store';
export * from './schema';

export default createPlugin({
  variables: z.object({
    network: z.enum(['mainnet', 'testnet']).default('mainnet'),
    contractId: z.string().default('social.near'),
    nodeUrl: z.string().optional(),
    returnAddress: ReturnAddressSchema.optional(),
  }),

  secrets: z.object({
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    GELATO_API_KEY: z.string().optional(),
    GELATO_WEBHOOK_SECRET: z.string().optional(),
    PRINTFUL_API_KEY: z.string().optional(),
    PRINTFUL_STORE_ID: z.string().optional(),
    PRINTFUL_WEBHOOK_SECRET: z.string().optional(),
    PING_API_KEY: z.string().optional(),
    PING_WEBHOOK_SECRET: z.string().optional(),
    API_DATABASE_URL: z.string().default('file:./marketplace.db'),
    API_DATABASE_AUTH_TOKEN: z.string().optional(),
  }),

  context: z.object({
    nearAccountId: z.string().optional(),
  }),

  contract,

  initialize: (config) =>
    Effect.gen(function* () {
      const stripeService =
        config.secrets.STRIPE_SECRET_KEY && config.secrets.STRIPE_WEBHOOK_SECRET
          ? new StripeService(config.secrets.STRIPE_SECRET_KEY, config.secrets.STRIPE_WEBHOOK_SECRET)
          : null;

      const runtime = yield* Effect.promise(() =>
        createMarketplaceRuntime(
          {
            printful: config.secrets.PRINTFUL_API_KEY && config.secrets.PRINTFUL_STORE_ID
              ? {
                apiKey: config.secrets.PRINTFUL_API_KEY,
                storeId: config.secrets.PRINTFUL_STORE_ID,
                webhookSecret: config.secrets.PRINTFUL_WEBHOOK_SECRET,
              }
              : undefined,
            gelato:
              config.secrets.GELATO_API_KEY && config.secrets.GELATO_WEBHOOK_SECRET
                ? {
                  apiKey: config.secrets.GELATO_API_KEY,
                  webhookSecret: config.secrets.GELATO_WEBHOOK_SECRET,
                  returnAddress: config.variables.returnAddress,
                }
                : undefined,
          },
          {
            stripe: config.secrets.STRIPE_SECRET_KEY && config.secrets.STRIPE_WEBHOOK_SECRET
              ? {
                secretKey: config.secrets.STRIPE_SECRET_KEY,
                webhookSecret: config.secrets.STRIPE_WEBHOOK_SECRET,
              }
              : undefined,
            ping: {
              apiKey: config.secrets.PING_API_KEY,
              webhookSecret: config.secrets.PING_WEBHOOK_SECRET,
            },
          }
        )
      );

      const dbLayer = DatabaseLive(config.secrets.API_DATABASE_URL, config.secrets.API_DATABASE_AUTH_TOKEN);

      const appLayer = ProductServiceLive(runtime).pipe(
        Layer.provide(ProductStoreLive),
        Layer.provide(dbLayer)
      );

      const checkoutLayer = CheckoutServiceLive(runtime).pipe(
        Layer.provide(OrderStoreLive),
        Layer.provide(ProductStoreLive),
        Layer.provide(dbLayer)
      );

      const orderLayer = OrderStoreLive.pipe(Layer.provide(dbLayer));

      console.log('[Marketplace] Plugin initialized');
      console.log(`[Marketplace] Providers: ${runtime.providers.map((p) => p.name).join(', ') || 'none'}`);
      console.log(`[Marketplace] Stripe: ${stripeService ? 'configured' : 'not configured'}`);

      return {
        stripeService,
        runtime,
        appLayer,
        checkoutLayer,
        orderLayer,
        secrets: config.secrets,
      };
    }),

  shutdown: (context) =>
    Effect.gen(function* () {
      yield* Effect.promise(() => context.runtime.shutdown());
    }),

  createRouter: (context, builder) => {
    const { stripeService, runtime, appLayer, checkoutLayer, orderLayer, secrets } = context;

    const requireAuth = builder.middleware(async ({ context, next }) => {
      if (!context.nearAccountId) {
        throw new ORPCError('UNAUTHORIZED', {
          message: 'Authentication required',
          data: { authType: 'nearAccountId' }
        });
      }
      return next({
        context: {
          nearAccountId: context.nearAccountId,
        }
      });
    });

    return {
      ping: builder.ping.handler(async () => {
        return {
          status: 'ok' as const,
          timestamp: new Date().toISOString(),
        };
      }),

      getProducts: builder.getProducts.handler(async ({ input }) => {
        return await Effect.runPromise(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.getProducts(input);
          }).pipe(Effect.provide(appLayer))
        );
      }),

      getProduct: builder.getProduct.handler(async ({ input }) => {
        return await Effect.runPromise(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.getProduct(input.id);
          }).pipe(Effect.provide(appLayer))
        );
      }),

      searchProducts: builder.searchProducts.handler(async ({ input }) => {
        return await Effect.runPromise(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.searchProducts(input);
          }).pipe(Effect.provide(appLayer))
        );
      }),

      getFeaturedProducts: builder.getFeaturedProducts.handler(async ({ input }) => {
        return await Effect.runPromise(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.getFeaturedProducts(input.limit);
          }).pipe(Effect.provide(appLayer))
        );
      }),

      getCollections: builder.getCollections.handler(async () => {
        return await Effect.runPromise(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.getCollections();
          }).pipe(Effect.provide(appLayer))
        );
      }),

      getCollection: builder.getCollection.handler(async ({ input }) => {
        return await Effect.runPromise(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.getCollection(input.slug);
          }).pipe(Effect.provide(appLayer))
        );
      }),

      sync: builder.sync.handler(async () => {
        return await Effect.runPromise(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.sync();
          }).pipe(Effect.provide(appLayer))
        );
      }),

      getSyncStatus: builder.getSyncStatus.handler(async () => {
        return await Effect.runPromise(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.getSyncStatus();
          }).pipe(Effect.provide(appLayer))
        );
      }),
      updateProductListing: builder.updateProductListing.handler(async ({ input }) => {
        return await Effect.runPromise(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.updateProductListing(input.id, input.listed);
          }).pipe(Effect.provide(appLayer))
        );
      }),
      createCheckout: builder.createCheckout
        .use(requireAuth)
        .handler(async ({ input, context }) => {
          const result = await Effect.runPromise(
            Effect.gen(function* () {
              const service = yield* CheckoutService;
              return yield* service.createCheckout({
                userId: context.nearAccountId,
                items: input.items,
                address: input.shippingAddress,
                selectedRates: input.selectedRates,
                shippingCost: input.shippingCost,
                successUrl: input.successUrl,
                cancelUrl: input.cancelUrl,
                paymentProvider: input.paymentProvider,
              });
            }).pipe(Effect.provide(checkoutLayer))
          );

          return {
            checkoutSessionId: result.checkoutSessionId,
            checkoutUrl: result.checkoutUrl,
            orderId: result.orderId,
          };
        }),

      quote: builder.quote.handler(async ({ input }) => {
        try {
          return await Effect.runPromise(
            Effect.gen(function* () {
              const service = yield* CheckoutService;
              return yield* service.getQuote(input.items, input.shippingAddress);
            }).pipe(Effect.provide(checkoutLayer))
          );
        } catch (error) {
          throw new ORPCError('BAD_REQUEST', {
            message: error instanceof Error ? error.message : 'Failed to calculate shipping',
          });
        }
      }),

      getOrders: builder.getOrders
        .use(requireAuth)
        .handler(async ({ input, context }) => {
          const result = await Effect.runPromise(
            Effect.gen(function* () {
              const store = yield* OrderStore;
              return yield* store.findByUser(context.nearAccountId!, input);
            }).pipe(Effect.provide(orderLayer))
          );

          return {
            orders: result.orders,
            total: result.total,
          };
        }),

      getOrder: builder.getOrder
        .use(requireAuth)
        .handler(async ({ input, context }) => {
          const order = await Effect.runPromise(
            Effect.gen(function* () {
              const store = yield* OrderStore;
              return yield* store.find(input.id);
            }).pipe(Effect.provide(orderLayer))
          );

          if (!order) {
            throw new Error('Order not found');
          }

          if (order.userId !== context.nearAccountId) {
            throw new ORPCError('FORBIDDEN', {
              message: 'You do not have permission to access this order'
            });
          }

          return { order };
        }),

      getOrderByCheckoutSession: builder.getOrderByCheckoutSession.handler(async ({ input }) => {
        const order = await Effect.runPromise(
          Effect.gen(function* () {
            const store = yield* OrderStore;
            return yield* store.findByCheckoutSession(input.sessionId);
          }).pipe(Effect.provide(orderLayer))
        );

        return { order };
      }),

      stripeWebhook: builder.stripeWebhook.handler(async ({ input }) => {
        if (!stripeService) {
          throw new Error('Stripe is not configured');
        }

        const event = await Effect.runPromise(
          stripeService.verifyWebhookSignature(input.body, input.signature)
        );

        if (event.type === 'checkout.session.completed') {
          const session = event.data.object;
          const orderId = session.metadata?.orderId;
          const draftOrderIdsJson = session.metadata?.draftOrderIds;

          if (!orderId) {
            console.log('[Stripe Webhook] No orderId in metadata, skipping');
            return { received: true };
          }

          const order = await Effect.runPromise(
            Effect.gen(function* () {
              const store = yield* OrderStore;
              return yield* store.find(orderId);
            }).pipe(Effect.provide(orderLayer))
          );

          if (!order) {
            console.error(`[Stripe Webhook] Order not found: ${orderId}`);
            return { received: true };
          }

          if (order.status !== 'draft_created' && order.status !== 'pending') {
            console.log(`[Stripe Webhook] Order ${orderId} already processed (status: ${order.status}), skipping`);
            return { received: true };
          }

          await Effect.runPromise(
            Effect.gen(function* () {
              const store = yield* OrderStore;
              yield* store.updateStatus(orderId, 'paid');
            }).pipe(Effect.provide(orderLayer))
          );

          if (!draftOrderIdsJson) {
            console.log('[Stripe Webhook] No draft orders to confirm');
            return { received: true };
          }

          try {
            const draftOrderIds = JSON.parse(draftOrderIdsJson) as Record<string, string>;
            const confirmationResults: Record<string, { success: boolean; error?: string }> = {};

            for (const [providerName, draftId] of Object.entries(draftOrderIds)) {
              if (providerName === 'manual') {
                continue;
              }

              const provider = runtime.getProvider(providerName);
              if (!provider) {
                console.error(`[Stripe Webhook] Provider not found: ${providerName}`);
                confirmationResults[providerName] = { 
                  success: false, 
                  error: 'Provider not configured' 
                };
                continue;
              }

              const confirmEffect = Effect.tryPromise({
                try: () => provider.client.confirmOrder({ id: draftId }),
                catch: (error) => 
                  new Error(
                    `Failed to confirm order at ${providerName}: ${
                      error instanceof Error ? error.message : String(error)
                    }`
                  ),
              }).pipe(
                Effect.retry({ times: 3, schedule: Schedule.exponential('100 millis') })
              );

              try {
                const result = await Effect.runPromise(confirmEffect);
                confirmationResults[providerName] = { success: true };
                console.log(`[Stripe Webhook] Confirmed draft order ${draftId} at ${providerName}: ${result.status}`);
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                confirmationResults[providerName] = { success: false, error: errorMessage };
                console.error(`[Stripe Webhook] Failed to confirm ${providerName} draft ${draftId}:`, errorMessage);
              }
            }

            const allSuccess = Object.values(confirmationResults).every(r => r.success);
            const finalStatus = allSuccess ? 'processing' : 'paid_pending_fulfillment';

            await Effect.runPromise(
              Effect.gen(function* () {
                const store = yield* OrderStore;
                yield* store.updateStatus(orderId, finalStatus);
              }).pipe(Effect.provide(orderLayer))
            );

            if (!allSuccess) {
              console.error(`[Stripe Webhook] Order ${orderId} has failed confirmations:`, confirmationResults);
            }
          } catch (error) {
            console.error('[Stripe Webhook] Error processing draft confirmations:', error);
            await Effect.runPromise(
              Effect.gen(function* () {
                const store = yield* OrderStore;
                yield* store.updateStatus(orderId, 'paid_pending_fulfillment');
              }).pipe(Effect.provide(orderLayer))
            );
          }
        }

        return { received: true };
      }),

      printfulWebhook: builder.printfulWebhook.handler(async ({ input }) => {
        try {
          const payload = JSON.parse(input.body);
          const eventType = payload.type;
          const data = payload.data;

          console.log(`[Printful Webhook] Received event: ${eventType}`);

          const externalId = data?.order?.external_id;
          if (!externalId) {
            console.log('[Printful Webhook] No external_id found, skipping');
            return { received: true };
          }

          const order = await Effect.runPromise(
            Effect.gen(function* () {
              const store = yield* OrderStore;
              return yield* store.find(externalId);
            }).pipe(Effect.provide(orderLayer))
          );

          if (!order) {
            console.log(`[Printful Webhook] Order not found: ${externalId}`);
            return { received: true };
          }

          let newStatus: OrderStatus | undefined = undefined;
          let newTracking: TrackingInfo[] | undefined = undefined;

          switch (eventType) {
            case 'package_shipped':
              newStatus = 'shipped';
              if (data.shipment) {
                newTracking = [{
                  trackingCode: data.shipment.tracking_number || '',
                  trackingUrl: data.shipment.tracking_url || '',
                  shipmentMethodName: data.shipment.service || 'Standard',
                }];
              }
              break;

            case 'order_put_hold':
            case 'order_put_hold_approval':
              console.log(`[Printful Webhook] Order ${externalId} put on hold`);
              break;

            case 'order_canceled':
              newStatus = 'cancelled';
              break;

            case 'order_failed':
              console.error(`[Printful Webhook] Order ${externalId} failed`);
              break;

            default:
              console.log(`[Printful Webhook] Unhandled event type: ${eventType}`);
          }

          if (newStatus) {
            const statusToUpdate = newStatus;
            await Effect.runPromise(
              Effect.gen(function* () {
                const store = yield* OrderStore;
                yield* store.updateStatus(externalId, statusToUpdate);
              }).pipe(Effect.provide(orderLayer))
            );
          }

          if (newTracking) {
            const trackingToUpdate = newTracking;
            await Effect.runPromise(
              Effect.gen(function* () {
                const store = yield* OrderStore;
                yield* store.updateTracking(externalId, trackingToUpdate);
              }).pipe(Effect.provide(orderLayer))
            );
          }
        } catch (error) {
          console.error('[Printful Webhook] Error processing webhook:', error);
        }

        return { received: true };
      }),

      gelatoWebhook: builder.gelatoWebhook.handler(async ({ input }) => {
        try {
          const payload = JSON.parse(input.body);
          const eventType = payload.event;
          const orderData = payload.order || payload;

          console.log(`[Gelato Webhook] Received event: ${eventType}`);

          const externalId = orderData.orderReferenceId || orderData.externalId;
          if (!externalId) {
            console.log('[Gelato Webhook] No external ID found, skipping');
            return { received: true };
          }

          const order = await Effect.runPromise(
            Effect.gen(function* () {
              const store = yield* OrderStore;
              return yield* store.find(externalId);
            }).pipe(Effect.provide(orderLayer))
          );

          if (!order) {
            console.log(`[Gelato Webhook] Order not found: ${externalId}`);
            return { received: true };
          }

          let newStatus: OrderStatus | undefined = undefined;
          let newTracking: TrackingInfo[] | undefined = undefined;

          switch (eventType) {
            case 'shipment_created':
            case 'shipment:created':
              newStatus = 'shipped';
              const shipments = orderData.shipments || [orderData.shipment];
              if (shipments && shipments.length > 0) {
                newTracking = shipments.map((s: any) => ({
                  trackingCode: s.trackingCode || s.tracking_code || '',
                  trackingUrl: s.trackingUrl || s.tracking_url || '',
                  shipmentMethodName: s.shipmentMethodName || s.method || 'Standard',
                  shipmentMethodUid: s.shipmentMethodUid,
                  fulfillmentCountry: s.fulfillmentCountry,
                }));
              }
              break;

            case 'order_cancelled':
            case 'order:cancelled':
              newStatus = 'cancelled';
              break;

            case 'delivered':
            case 'order:delivered':
              newStatus = 'delivered';
              break;

            case 'order_created':
            case 'order:created':
              newStatus = 'processing';
              break;

            default:
              console.log(`[Gelato Webhook] Unhandled event type: ${eventType}`);
          }

          if (newStatus) {
            const statusToUpdate = newStatus;
            await Effect.runPromise(
              Effect.gen(function* () {
                const store = yield* OrderStore;
                yield* store.updateStatus(externalId, statusToUpdate);
              }).pipe(Effect.provide(orderLayer))
            );
          }

          if (newTracking) {
            const trackingToUpdate = newTracking;
            await Effect.runPromise(
              Effect.gen(function* () {
                const store = yield* OrderStore;
                yield* store.updateTracking(externalId, trackingToUpdate);
              }).pipe(Effect.provide(orderLayer))
            );
          }
        } catch (error) {
          console.error('[Gelato Webhook] Error processing webhook:', error);
        }

        return { received: true };
      }),

      pingWebhook: builder.pingWebhook.handler(async ({ input }) => {
        const pingProvider = runtime.getPaymentProvider('pingpay');
        if (!pingProvider) {
          console.error('[Ping Webhook] PingPay provider not configured');
          throw new Error('PingPay provider not configured');
        }

        const { body, signature, timestamp } = input;

        const webhookResult = await Effect.runPromise(
          Effect.tryPromise({
            try: async () => {
              const result = await pingProvider.client.verifyWebhook({
                body,
                signature,
                timestamp,
              });
              return result;
            },
            catch: (error) =>
              new Error(`Webhook verification failed: ${error instanceof Error ? error.message : String(error)}`),
          })
        );

        const eventType = webhookResult.eventType;
        console.log(`[Ping Webhook] Received event: ${eventType}`);

        const payload = JSON.parse(body);
        const sessionId = payload.sessionId || payload.data?.sessionId;
        const orderId = webhookResult.orderId || payload.metadata?.orderId || payload.data?.metadata?.orderId;
        const draftOrderIdsJson = payload.metadata?.draftOrderIds || payload.data?.metadata?.draftOrderIds;

        let order = orderId
          ? await Effect.runPromise(
              Effect.gen(function* () {
                const store = yield* OrderStore;
                return yield* store.find(orderId);
              }).pipe(Effect.provide(orderLayer))
            )
          : null;

        if (!order && sessionId) {
          order = await Effect.runPromise(
            Effect.gen(function* () {
              const store = yield* OrderStore;
              return yield* store.findByCheckoutSession(sessionId);
            }).pipe(Effect.provide(orderLayer))
          );
        }

        if (!order) {
          console.log(`[Ping Webhook] Order not found for sessionId: ${sessionId}, orderId: ${orderId}`);
          return { received: true };
        }

        const resolvedOrderId = order.id;
        const resolvedDraftOrderIds = order.draftOrderIds || (draftOrderIdsJson ? JSON.parse(draftOrderIdsJson) : {});

        switch (eventType) {
          case 'payment.success':
          case 'checkout.session.completed': {
            if (order.status !== 'draft_created' && order.status !== 'pending' && order.status !== 'payment_pending') {
              console.log(`[Ping Webhook] Order ${resolvedOrderId} already processed (status: ${order.status}), skipping`);
              return { received: true };
            }

            await Effect.runPromise(
              Effect.gen(function* () {
                const store = yield* OrderStore;
                yield* store.updateStatus(resolvedOrderId, 'paid');
              }).pipe(Effect.provide(orderLayer))
            );

            if (Object.keys(resolvedDraftOrderIds).length === 0) {
              console.log('[Ping Webhook] No draft orders to confirm');
              return { received: true };
            }

            const confirmationResults: Record<string, { success: boolean; error?: string }> = {};

            for (const [providerName, draftId] of Object.entries(resolvedDraftOrderIds)) {
              if (providerName === 'manual') {
                confirmationResults[providerName] = { success: true };
                continue;
              }

              const provider = runtime.getProvider(providerName);
              if (!provider) {
                console.error(`[Ping Webhook] Provider not found: ${providerName}`);
                confirmationResults[providerName] = {
                  success: false,
                  error: 'Provider not configured',
                };
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

              try {
                const result = await Effect.runPromise(confirmEffect);
                confirmationResults[providerName] = { success: true };
                console.log(`[Ping Webhook] Confirmed draft order ${draftId} at ${providerName}: ${result.status}`);
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                confirmationResults[providerName] = { success: false, error: errorMessage };
                console.error(`[Ping Webhook] Failed to confirm ${providerName} draft ${draftId}:`, errorMessage);
              }
            }

            const allSuccess = Object.values(confirmationResults).every((r) => r.success);
            const finalStatus: OrderStatus = allSuccess ? 'processing' : 'paid_pending_fulfillment';

            await Effect.runPromise(
              Effect.gen(function* () {
                const store = yield* OrderStore;
                yield* store.updateStatus(resolvedOrderId, finalStatus);
              }).pipe(Effect.provide(orderLayer))
            );

            if (!allSuccess) {
              console.error(`[Ping Webhook] Order ${resolvedOrderId} has failed confirmations:`, confirmationResults);
            }
            break;
          }

          case 'payment.failed':
            console.error(`[Ping Webhook] Payment failed for order ${resolvedOrderId}`);
            await Effect.runPromise(
              Effect.gen(function* () {
                const store = yield* OrderStore;
                yield* store.updateStatus(resolvedOrderId, 'payment_failed');
              }).pipe(Effect.provide(orderLayer))
            );
            break;

          default:
            console.log(`[Ping Webhook] Unhandled event type: ${eventType}`);
        }

        return { received: true };
      }),

      cleanupAbandonedDrafts: builder.cleanupAbandonedDrafts.handler(async ({ input }) => {
        const maxAgeHours = input?.maxAgeHours || 24;

        return await Effect.runPromise(
          cleanupAbandonedDrafts(runtime, maxAgeHours).pipe(Effect.provide(orderLayer))
        );
      }),
    };
  },
});
