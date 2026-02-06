import * as crypto from 'crypto';
import { createPlugin } from 'every-plugin';
import { Effect, Layer, Schedule, Cause, Exit } from 'every-plugin/effect';
import { ORPCError } from 'every-plugin/orpc';
import { z } from 'every-plugin/zod';
import { contract } from './contract';
import { cleanupAbandonedDrafts } from './jobs/cleanup-drafts';
import { createMarketplaceRuntime } from './runtime';
import { ReturnAddressSchema, type OrderStatus, type TrackingInfo } from './schema';
import { CheckoutService, CheckoutServiceLive } from './services/checkout';
import { ProductService, ProductServiceLive } from './services/products';
import { StripeService } from './services/stripe';
import { DatabaseLive, OrderStore, OrderStoreLive, ProductStore, ProductStoreLive, ProductTypeStore, ProductTypeStoreLive, CollectionStoreLive } from './store';
import { ProviderConfigStore, ProviderConfigStoreLive } from './store/providers';
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
    reqHeaders: z.custom<Headers>().optional(),
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

      const dbLayer = DatabaseLive(config.secrets.API_DATABASE_URL);

      const appLayer = ProductServiceLive(runtime).pipe(
        Layer.provide(ProductStoreLive),
        Layer.provide(CollectionStoreLive),
        Layer.provide(dbLayer)
      );

      const checkoutLayer = CheckoutServiceLive(runtime).pipe(
        Layer.provide(OrderStoreLive),
        Layer.provide(ProductStoreLive),
        Layer.provide(dbLayer)
      );

      const orderLayer = OrderStoreLive.pipe(Layer.provide(dbLayer));
      const providerLayer = ProviderConfigStoreLive.pipe(Layer.provide(dbLayer));
      const productTypeLayer = ProductTypeStoreLive.pipe(Layer.provide(dbLayer));
      const productStoreLayer = ProductStoreLive.pipe(Layer.provide(dbLayer));

      // Cache for NEAR price
      const nearPriceCache: { price: number | null; cachedAt: number } = {
        price: null,
        cachedAt: 0,
      };

      console.log('[Marketplace] Plugin initialized');
      console.log(`[Marketplace] Providers: ${runtime.providers.map((p) => p.name).join(', ') || 'none'}`);
      console.log(`[Marketplace] Stripe: ${stripeService ? 'configured' : 'not configured'}`);

      return {
        stripeService,
        runtime,
        appLayer,
        checkoutLayer,
        orderLayer,
        providerLayer,
        productTypeLayer,
        productStoreLayer,
        secrets: config.secrets,
        nearPriceCache,
      };
    }),

  shutdown: (context) =>
    Effect.gen(function* () {
      yield* Effect.promise(() => context.runtime.shutdown());
    }),

  createRouter: (context, builder) => {
    const { stripeService, runtime, appLayer, checkoutLayer, orderLayer, providerLayer, productTypeLayer, productStoreLayer, secrets, nearPriceCache } = context;

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
        const exit = await Effect.runPromiseExit(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.getProducts(input);
          }).pipe(Effect.provide(appLayer))
        );

        if (Exit.isFailure(exit)) {
          const error = Cause.squash(exit.cause);
          if (error instanceof ORPCError) {
            throw error;
          }
          throw new ORPCError('INTERNAL_SERVER_ERROR', {
            message: error instanceof Error ? error.message : String(error),
          });
        }

        return exit.value;
      }),

      getProduct: builder.getProduct.handler(async ({ input, errors }) => {
        const exit = await Effect.runPromiseExit(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.getProduct(input.id);
          }).pipe(Effect.provide(appLayer))
        );

        if (Exit.isFailure(exit)) {
          const error = Cause.squash(exit.cause);
          if (error instanceof ORPCError) {
            throw error;
          }
          if (error instanceof Error && error.message.includes('Product not found')) {
            throw errors.NOT_FOUND({
              message: error.message,
              data: { resource: 'product', resourceId: input.id }
            });
          }
          throw error;
        }

        return exit.value;
      }),

      searchProducts: builder.searchProducts.handler(async ({ input }) => {
        const exit = await Effect.runPromiseExit(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.searchProducts(input);
          }).pipe(Effect.provide(appLayer))
        );

        if (Exit.isFailure(exit)) {
          const error = Cause.squash(exit.cause);
          if (error instanceof ORPCError) {
            throw error;
          }
          throw new ORPCError('INTERNAL_SERVER_ERROR', {
            message: error instanceof Error ? error.message : String(error),
          });
        }

        return exit.value;
      }),

      getFeaturedProducts: builder.getFeaturedProducts.handler(async ({ input }) => {
        const exit = await Effect.runPromiseExit(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.getFeaturedProducts(input.limit);
          }).pipe(Effect.provide(appLayer))
        );

        if (Exit.isFailure(exit)) {
          const error = Cause.squash(exit.cause);
          if (error instanceof ORPCError) {
            throw error;
          }
          throw new ORPCError('INTERNAL_SERVER_ERROR', {
            message: error instanceof Error ? error.message : String(error),
          });
        }

        return exit.value;
      }),

      getCollections: builder.getCollections.handler(async () => {
        const exit = await Effect.runPromiseExit(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.getCollections();
          }).pipe(Effect.provide(appLayer))
        );

        if (Exit.isFailure(exit)) {
          const error = Cause.squash(exit.cause);
          if (error instanceof ORPCError) {
            throw error;
          }
          throw new ORPCError('INTERNAL_SERVER_ERROR', {
            message: error instanceof Error ? error.message : String(error),
          });
        }

        return exit.value;
      }),

      getCollection: builder.getCollection.handler(async ({ input, errors }) => {
        const exit = await Effect.runPromiseExit(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.getCollection(input.slug);
          }).pipe(Effect.provide(appLayer))
        );

        if (Exit.isFailure(exit)) {
          const error = Cause.squash(exit.cause);
          if (error instanceof ORPCError) {
            throw error;
          }
          if (error instanceof Error && error.message.includes('Collection not found')) {
            throw errors.NOT_FOUND({
              message: error.message,
              data: { resource: 'collection', resourceId: input.slug }
            });
          }
          throw error;
        }

        return exit.value;
      }),

      getCarouselCollections: builder.getCarouselCollections.handler(async () => {
        const exit = await Effect.runPromiseExit(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.getCarouselCollections();
          }).pipe(Effect.provide(appLayer))
        );

        if (Exit.isFailure(exit)) {
          const error = Cause.squash(exit.cause);
          if (error instanceof ORPCError) {
            throw error;
          }
          throw new ORPCError('INTERNAL_SERVER_ERROR', {
            message: error instanceof Error ? error.message : String(error),
          });
        }

        return exit.value;
      }),
updateCollection: builder.updateCollection.handler(async ({ input }) => {
        const { slug, ...data } = input;
        const exit = await Effect.runPromiseExit(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.updateCollection(slug, data);
          }).pipe(Effect.provide(appLayer))
        );

        if (Exit.isFailure(exit)) {
          const error = Cause.squash(exit.cause);
          if (error instanceof ORPCError) {
            throw error;
          }
          throw new ORPCError('INTERNAL_SERVER_ERROR', {
            message: error instanceof Error ? error.message : String(error),
          });
        }

        return exit.value;
      }),

      updateCollectionFeaturedProduct: builder.updateCollectionFeaturedProduct.handler(async ({ input }) => {
        const exit = await Effect.runPromiseExit(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.updateCollectionFeaturedProduct(input.slug, input.productId);
          }).pipe(Effect.provide(appLayer))
        );

        if (Exit.isFailure(exit)) {
          const error = Cause.squash(exit.cause);
          if (error instanceof ORPCError) {
            throw error;
          }
          throw new ORPCError('INTERNAL_SERVER_ERROR', {
            message: error instanceof Error ? error.message : String(error),
          });
        }

        return exit.value;
      }),

      sync: builder.sync.handler(async () => {
        try {
          return await Effect.runPromise(
            Effect.gen(function* () {
              const service = yield* ProductService;
              return yield* service.sync();
            }).pipe(Effect.provide(appLayer))
          );
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          const getSyncStatusWithLayer = async () => {
            return await Effect.runPromise(
              Effect.gen(function* () {
                const service = yield* ProductService;
                return yield* service.getSyncStatus();
              }).pipe(Effect.provide(appLayer))
            );
          };
          
          const status = await getSyncStatusWithLayer();
          const now = Date.now();
          const syncStartedAt = status.syncStartedAt;
          const duration = syncStartedAt ? Math.floor((now - syncStartedAt) / 1000) : 0;
          
          if (errorMessage.includes('SYNC_IN_PROGRESS')) {
            throw new ORPCError('SYNC_IN_PROGRESS', {
              message: 'Sync is already in progress',
              data: {
                syncStartedAt: syncStartedAt ? new Date(syncStartedAt).toISOString() : new Date().toISOString(),
                duration,
              },
            });
          }
          
          if (errorMessage.includes('SYNC_PROVIDER_ERROR')) {
            const errorData = status.errorData || {};
            throw new ORPCError('SYNC_PROVIDER_ERROR', {
              message: 'Fulfillment provider temporarily unavailable',
              data: {
                provider: errorData.provider || 'unknown',
                errorType: errorData.errorType || 'API_ERROR',
                retryAfter: errorData.retryAfter,
                originalMessage: errorData.originalMessage || errorMessage,
              },
            });
          }
          
          if (errorMessage.includes('SYNC_FAILED')) {
            const errorData = status.errorData || {};
            throw new ORPCError('SYNC_FAILED', {
              message: 'Sync operation failed',
              data: {
                stage: errorData.stage || 'UNKNOWN',
                errorMessage: errorMessage,
                provider: errorData.provider,
                syncDuration: errorData.syncDuration || duration,
              },
            });
          }
          
          throw error;
        }
      }),

      getSyncStatus: builder.getSyncStatus.handler(async () => {
        const exit = await Effect.runPromiseExit(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.getSyncStatus();
          }).pipe(Effect.provide(appLayer))
        );

        if (Exit.isFailure(exit)) {
          const error = Cause.squash(exit.cause);
          if (error instanceof ORPCError) {
            throw error;
          }
          throw new ORPCError('INTERNAL_SERVER_ERROR', {
            message: error instanceof Error ? error.message : String(error),
          });
        }

        return exit.value;
      }),

      getNearPrice: builder.getNearPrice.handler(async () => {
        const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=near&vs_currencies=usd';
        const CACHE_TTL = 60 * 1000; // 60 seconds
        const FALLBACK_PRICE = 3.5;

        const now = Date.now();
        if (nearPriceCache.price && now - nearPriceCache.cachedAt < CACHE_TTL) {
          return {
            price: nearPriceCache.price,
            currency: 'USD' as const,
            source: 'coingecko',
            cachedAt: nearPriceCache.cachedAt,
          };
        }

        try {
          const response = await fetch(COINGECKO_URL);
          if (!response.ok) {
            throw new Error('Failed to fetch NEAR price');
          }
          const data = await response.json() as { near: { usd: number } };
          const price = data.near.usd;

          nearPriceCache.price = price;
          nearPriceCache.cachedAt = now;

          return {
            price,
            currency: 'USD' as const,
            source: 'coingecko',
            cachedAt: now,
          };
        } catch (error) {
          console.error('[getNearPrice] Failed to fetch from CoinGecko:', error);
          return {
            price: nearPriceCache.price || FALLBACK_PRICE,
            currency: 'USD' as const,
            source: nearPriceCache.price ? 'coingecko' : 'fallback',
            cachedAt: nearPriceCache.cachedAt || now,
          };
        }
      }),

      updateProductListing: builder.updateProductListing.handler(async ({ input }) => {
        const exit = await Effect.runPromiseExit(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.updateProductListing(input.id, input.listed);
          }).pipe(Effect.provide(appLayer))
        );

        if (Exit.isFailure(exit)) {
          const error = Cause.squash(exit.cause);
          if (error instanceof ORPCError) {
            throw error;
          }
          throw new ORPCError('INTERNAL_SERVER_ERROR', {
            message: error instanceof Error ? error.message : String(error),
          });
        }

        return exit.value;
      }),
      createCheckout: builder.createCheckout
        .use(requireAuth)
        .handler(async ({ input, context, errors }) => {
          const exit = await Effect.runPromiseExit(
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

          if (Exit.isFailure(exit)) {
            const error = Cause.squash(exit.cause);
            if (error instanceof ORPCError) {
              throw error;
            }
            throw new ORPCError('INTERNAL_SERVER_ERROR', {
              message: error instanceof Error ? error.message : String(error),
            });
          }

          const result = exit.value;
          return {
            checkoutSessionId: result.checkoutSessionId,
            checkoutUrl: result.checkoutUrl,
            orderId: result.orderId,
          };
        }),

      quote: builder.quote.handler(async ({ input }) => {
        const exit = await Effect.runPromiseExit(
          Effect.gen(function* () {
            const service = yield* CheckoutService;
            return yield* service.getQuote(input.items, input.shippingAddress);
          }).pipe(Effect.provide(checkoutLayer))
        );

        if (Exit.isFailure(exit)) {
          const error = Cause.squash(exit.cause);
          if (error instanceof ORPCError) {
            throw error;
          }
          throw new ORPCError('BAD_REQUEST', {
            message: error instanceof Error ? error.message : 'Failed to calculate shipping',
          });
        }

        return exit.value;
      }),

      getOrders: builder.getOrders
        .use(requireAuth)
        .handler(async ({ input, context }) => {
          const exit = await Effect.runPromiseExit(
            Effect.gen(function* () {
              const store = yield* OrderStore;
              return yield* store.findByUser(context.nearAccountId!, input);
            }).pipe(Effect.provide(orderLayer))
          );

          if (Exit.isFailure(exit)) {
            const error = Cause.squash(exit.cause);
            if (error instanceof ORPCError) {
              throw error;
            }
            throw new ORPCError('INTERNAL_SERVER_ERROR', {
              message: error instanceof Error ? error.message : String(error),
            });
          }

          const result = exit.value;
          return {
            orders: result.orders,
            total: result.total,
          };
        }),

      getOrder: builder.getOrder
        .use(requireAuth)
        .handler(async ({ input, context, errors }) => {
          const exit = await Effect.runPromiseExit(
            Effect.gen(function* () {
              const store = yield* OrderStore;
              return yield* store.find(input.id);
            }).pipe(Effect.provide(orderLayer))
          );

          if (Exit.isFailure(exit)) {
            const error = Cause.squash(exit.cause);
            if (error instanceof ORPCError) {
              throw error;
            }
            throw errors.NOT_FOUND({
              message: 'Order not found',
              data: { resource: 'order', resourceId: input.id }
            });
          }

          const order = exit.value;
          
          if (!order) {
            throw errors.NOT_FOUND({
              message: 'Order not found',
              data: { resource: 'order', resourceId: input.id }
            });
          }

          if (order.userId !== context.nearAccountId) {
            throw errors.FORBIDDEN({
              message: 'You do not have permission to access this order',
              data: { action: 'read' }
            });
          }

          return { order };
        }),

      getOrderByCheckoutSession: builder.getOrderByCheckoutSession.handler(async ({ input }) => {
        const exit = await Effect.runPromiseExit(
          Effect.gen(function* () {
            const store = yield* OrderStore;
            return yield* store.findByCheckoutSession(input.sessionId);
          }).pipe(Effect.provide(orderLayer))
        );

        if (Exit.isFailure(exit)) {
          const error = Cause.squash(exit.cause);
          if (error instanceof ORPCError) {
            throw error;
          }
          throw new ORPCError('INTERNAL_SERVER_ERROR', {
            message: error instanceof Error ? error.message : String(error),
          });
        }

        return { order: exit.value };
      }),

      subscribeOrderStatus: builder.subscribeOrderStatus.handler(async function* ({ input, signal }) {
        const TERMINAL_STATUSES = ['shipped', 'delivered', 'cancelled', 'failed', 'returned', 'refunded', 'on_hold', 'partially_cancelled'];
        const POLL_INTERVAL = 500;

        let lastStatus: string | undefined;
        let lastTrackingJson: string | undefined;

        while (!signal?.aborted) {
          const order = await Effect.runPromise(
            Effect.gen(function* () {
              const store = yield* OrderStore;
              return yield* store.findByCheckoutSession(input.sessionId);
            }).pipe(Effect.provide(orderLayer))
          );

          if (!order) {
            await new Promise(r => setTimeout(r, POLL_INTERVAL));
            continue;
          }

          const currentTrackingJson = JSON.stringify(order.trackingInfo || []);
          const hasStatusChange = order.status !== lastStatus;
          const hasTrackingChange = currentTrackingJson !== lastTrackingJson;

          if (hasStatusChange || hasTrackingChange) {
            lastStatus = order.status;
            lastTrackingJson = currentTrackingJson;

            yield {
              status: order.status,
              trackingInfo: order.trackingInfo,
              updatedAt: order.updatedAt,
            };

            if (TERMINAL_STATUSES.includes(order.status)) {
              return;
            }
          }

          await new Promise(r => setTimeout(r, POLL_INTERVAL));
        }
      }),

      getAllOrders: builder.getAllOrders
        .use(requireAuth)
        .handler(async ({ input }) => {
          const exit = await Effect.runPromiseExit(
            Effect.gen(function* () {
              const store = yield* OrderStore;
              return yield* store.findAll({
                limit: input.limit,
                offset: input.offset,
                status: input.status,
                search: input.search,
              });
            }).pipe(Effect.provide(orderLayer))
          );

          if (Exit.isFailure(exit)) {
            const error = Cause.squash(exit.cause);
            if (error instanceof ORPCError) {
              throw error;
            }
            throw new ORPCError('INTERNAL_SERVER_ERROR', {
              message: error instanceof Error ? error.message : String(error),
            });
          }

          const result = exit.value;
          return {
            orders: result.orders,
            total: result.total,
          };
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
            return { received: true };
          }

          const order = await Effect.runPromise(
            Effect.gen(function* () {
              const store = yield* OrderStore;
              return yield* store.find(orderId);
            }).pipe(Effect.provide(orderLayer))
          );

          if (!order) {
            return { received: true };
          }

          if (order.status !== 'draft_created' && order.status !== 'pending') {
            return { received: true };
          }

          await Effect.runPromise(
            Effect.gen(function* () {
              const store = yield* OrderStore;
              yield* store.updateStatus(orderId, 'paid');
            }).pipe(Effect.provide(orderLayer))
          );

          if (!draftOrderIdsJson) {
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
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                confirmationResults[providerName] = { success: false, error: errorMessage };
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
          } catch (error) {
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

      printfulWebhook: builder.printfulWebhook.handler(async ({ input, context }) => {
        const signature = context.reqHeaders?.get('x-pf-webhook-signature') || input.signature || '';

        let webhookSecret = secrets.PRINTFUL_WEBHOOK_SECRET;
        if (!webhookSecret) {
          const dbSecret = await Effect.runPromise(
            Effect.gen(function* () {
              const store = yield* ProviderConfigStore;
              return yield* store.getSecretKey('printful');
            }).pipe(Effect.provide(providerLayer))
          );
          webhookSecret = dbSecret || undefined;
        }

        if (webhookSecret && signature) {
          try {
            const secretBuffer = Buffer.from(webhookSecret, 'hex');
            const expected = crypto
              .createHmac('sha256', secretBuffer)
              .update(input.body)
              .digest('hex');

            if (signature.length !== expected.length) {
              console.error('[Printful Webhook] Signature length mismatch');
              throw new ORPCError('UNAUTHORIZED', { message: 'Invalid webhook signature' });
            }

            const isValid = crypto.timingSafeEqual(
              Buffer.from(signature, 'hex'),
              Buffer.from(expected, 'hex')
            );

            if (!isValid) {
              throw new ORPCError('UNAUTHORIZED', { message: 'Invalid webhook signature' });
            }
          } catch (error) {
            if (error instanceof ORPCError) throw error;
            throw new ORPCError('UNAUTHORIZED', { message: 'Webhook signature verification failed' });
          }
        }

        try {
          const payload = JSON.parse(input.body);
          const eventType = payload.type;
          const data = payload.data;

          const externalId = data?.order?.external_id;
          if (!externalId) {
            return { received: true };
          }

          const order = await Effect.runPromise(
            Effect.gen(function* () {
              const store = yield* OrderStore;
              return yield* store.find(externalId);
            }).pipe(Effect.provide(orderLayer))
          );

          if (!order) {
            return { received: true };
          }

          let newStatus: OrderStatus | undefined = undefined;
          let newTracking: TrackingInfo[] | undefined = undefined;

          switch (eventType) {
            case 'order_created':
              if (order.status === 'paid' || order.status === 'paid_pending_fulfillment') {
                newStatus = 'processing';
              }
              break;

            case 'shipment_sent':
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

            case 'shipment_delivered':
              newStatus = 'delivered';
              break;

            case 'shipment_returned':
              newStatus = 'returned';
              break;

            case 'order_put_hold':
            case 'order_put_hold_approval':
              newStatus = 'on_hold';
              break;

            case 'order_remove_hold':
              if (order.status === 'on_hold') {
                newStatus = 'processing';
              }
              break;

            case 'order_canceled':
              newStatus = 'cancelled';
              break;

            case 'order_failed':
              newStatus = 'failed';
              break;

            default:
              break;
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
          if (error instanceof ORPCError) throw error;
        }

        return { received: true };
      }),

      gelatoWebhook: builder.gelatoWebhook.handler(async ({ input }) => {
        try {
          const payload = JSON.parse(input.body);
          const eventType = payload.event;
          const orderData = payload.order || payload;

          const externalId = orderData.orderReferenceId || orderData.externalId;
          if (!externalId) {
            return { received: true };
          }

          const order = await Effect.runPromise(
            Effect.gen(function* () {
              const store = yield* OrderStore;
              return yield* store.find(externalId);
            }).pipe(Effect.provide(orderLayer))
          );

          if (!order) {
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
              break;
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
        }

        return { received: true };
      }),

      pingWebhook: builder.pingWebhook.handler(async ({ input, context }) => {
        const pingProvider = runtime.getPaymentProvider('pingpay');
        if (!pingProvider) {
          throw new Error('PingPay provider not configured');
        }

        const signature = context.reqHeaders?.get('x-ping-signature') || '';
        const timestamp = context.reqHeaders?.get('x-ping-timestamp') || '';
        const body = JSON.stringify(input);

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

        const { orderId, sessionId } = webhookResult;

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
          return { received: true };
        }

        const resolvedOrderId = order.id;
        const draftOrderIds = order.draftOrderIds || {};

        switch (eventType) {
          case 'payment.success':
          case 'checkout.session.completed': {
            if (order.status !== 'draft_created' && order.status !== 'pending' && order.status !== 'payment_pending') {
              return { received: true };
            }

            await Effect.runPromise(
              Effect.gen(function* () {
                const store = yield* OrderStore;
                yield* store.updateStatus(resolvedOrderId, 'paid');
              }).pipe(Effect.provide(orderLayer))
            );

            if (Object.keys(draftOrderIds).length === 0) {
              return { received: true };
            }

            const confirmationResults: Record<string, { success: boolean; error?: string }> = {};

            for (const [providerName, draftId] of Object.entries(draftOrderIds)) {
              if (providerName === 'manual') {
                confirmationResults[providerName] = { success: true };
                continue;
              }

              const provider = runtime.getProvider(providerName);
              if (!provider) {
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
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                confirmationResults[providerName] = { success: false, error: errorMessage };
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
            break;
          }

          case 'payment.failed':
            await Effect.runPromise(
              Effect.gen(function* () {
                const store = yield* OrderStore;
                yield* store.updateStatus(resolvedOrderId, 'payment_failed');
              }).pipe(Effect.provide(orderLayer))
            );
            break;

          default:
            break;
        }

        return { received: true };
      }),

      cleanupAbandonedDrafts: builder.cleanupAbandonedDrafts.handler(async ({ input }) => {
        const maxAgeHours = input?.maxAgeHours || 24;
        const exit = await Effect.runPromiseExit(
          cleanupAbandonedDrafts(runtime, maxAgeHours).pipe(Effect.provide(orderLayer))
        );

        if (Exit.isFailure(exit)) {
          const error = Cause.squash(exit.cause);
          if (error instanceof ORPCError) {
            throw error;
          }
          throw new ORPCError('INTERNAL_SERVER_ERROR', {
            message: error instanceof Error ? error.message : String(error),
          });
        }

        return exit.value;
      }),

      getProviderConfig: builder.getProviderConfig
        .use(requireAuth)
        .handler(async ({ input }) => {
          const exit = await Effect.runPromiseExit(
            Effect.gen(function* () {
              const store = yield* ProviderConfigStore;
              return yield* store.getConfig(input.provider);
            }).pipe(Effect.provide(providerLayer))
          );

          if (Exit.isFailure(exit)) {
            const error = Cause.squash(exit.cause);
            if (error instanceof ORPCError) {
              throw error;
            }
            throw new ORPCError('INTERNAL_SERVER_ERROR', {
              message: error instanceof Error ? error.message : String(error),
            });
          }

          return { config: exit.value };
        }),

      configureWebhook: builder.configureWebhook
        .use(requireAuth)
        .handler(async ({ input }) => {
          const printfulProvider = runtime.getProvider('printful');
          if (!printfulProvider) {
            throw new ORPCError('BAD_REQUEST', { message: 'Printful provider not configured' });
          }

          const { PrintfulService } = await import('./services/fulfillment/printful/service');
          const printfulService = new PrintfulService(
            secrets.PRINTFUL_API_KEY!,
            secrets.PRINTFUL_STORE_ID!
          );

          const webhookUrl = input.webhookUrlOverride || '';
          
          let result;
          try {
            result = await Effect.runPromise(
              printfulService.configureWebhooks({
                defaultUrl: webhookUrl,
                events: input.events,
                expiresAt: input.expiresAt,
              })
            );
          } catch (error) {
            console.error('[configureWebhook] Failed to configure Printful webhooks:', error);
            throw new ORPCError('INTERNAL_SERVER_ERROR', {
              message: error instanceof Error ? error.message : 'Failed to configure webhook',
            });
          }

          try {
            await Effect.runPromise(
              Effect.gen(function* () {
                const store = yield* ProviderConfigStore;
                yield* store.upsertConfig({
                  provider: input.provider,
                  enabled: true,
                  webhookUrl: result.webhookUrl,
                  webhookUrlOverride: webhookUrl,
                  enabledEvents: result.enabledEvents,
                  publicKey: result.publicKey,
                  secretKey: result.secretKey,
                  lastConfiguredAt: Date.now(),
                  expiresAt: result.expiresAt,
                });
              }).pipe(Effect.provide(providerLayer))
            );
          } catch (error) {
            console.error('[configureWebhook] Failed to save webhook config:', error);
            throw new ORPCError('INTERNAL_SERVER_ERROR', {
              message: error instanceof Error ? error.message : 'Failed to save webhook configuration',
            });
          }

          return {
            success: true,
            webhookUrl: result.webhookUrl,
            enabledEvents: result.enabledEvents,
            publicKey: result.publicKey,
            expiresAt: result.expiresAt,
          };
        }),

      disableWebhook: builder.disableWebhook
        .use(requireAuth)
        .handler(async ({ input }) => {
          const printfulProvider = runtime.getProvider('printful');
          if (!printfulProvider) {
            throw new ORPCError('BAD_REQUEST', { message: 'Printful provider not configured' });
          }

          const { PrintfulService } = await import('./services/fulfillment/printful/service');
          const printfulService = new PrintfulService(
            secrets.PRINTFUL_API_KEY!,
            secrets.PRINTFUL_STORE_ID!
          );

          try {
            await Effect.runPromise(printfulService.disableWebhooks());
          } catch (error) {
            console.error('[disableWebhook] Failed to disable Printful webhooks:', error);
            throw new ORPCError('INTERNAL_SERVER_ERROR', {
              message: error instanceof Error ? error.message : 'Failed to disable webhook',
            });
          }

          try {
            await Effect.runPromise(
              Effect.gen(function* () {
                const store = yield* ProviderConfigStore;
                yield* store.clearWebhookConfig(input.provider);
              }).pipe(Effect.provide(providerLayer))
            );
          } catch (error) {
            console.error('[disableWebhook] Failed to clear webhook config:', error);
            throw new ORPCError('INTERNAL_SERVER_ERROR', {
              message: error instanceof Error ? error.message : 'Failed to clear webhook configuration',
            });
          }

          return { success: true };
        }),

      testProvider: builder.testProvider
        .use(requireAuth)
        .handler(async ({ input }) => {
          const printfulProvider = runtime.getProvider('printful');
          if (!printfulProvider) {
            throw new ORPCError('BAD_REQUEST', { message: 'Printful provider not configured' });
          }

          const { PrintfulService } = await import('./services/fulfillment/printful/service');
          const printfulService = new PrintfulService(
            secrets.PRINTFUL_API_KEY!,
            secrets.PRINTFUL_STORE_ID!
          );

          try {
            const result = await Effect.runPromise(printfulService.ping());
            return {
              success: result.success,
              timestamp: result.timestamp,
            };
          } catch (error) {
            return {
              success: false,
              message: error instanceof Error ? error.message : 'Connection test failed',
              timestamp: new Date().toISOString(),
            };
          }
        }),

      getCategories: builder.getCategories.handler(async () => {
        const exit = await Effect.runPromiseExit(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.getCategories();
          }).pipe(Effect.provide(appLayer))
        );

        if (Exit.isFailure(exit)) {
          const error = Cause.squash(exit.cause);
          if (error instanceof ORPCError) {
            throw error;
          }
          throw new ORPCError('INTERNAL_SERVER_ERROR', {
            message: error instanceof Error ? error.message : String(error),
          });
        }

        return exit.value;
      }),

      createCategory: builder.createCategory.handler(async ({ input }) => {
        const exit = await Effect.runPromiseExit(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.createCategory(input);
          }).pipe(Effect.provide(appLayer))
        );

        if (Exit.isFailure(exit)) {
          const error = Cause.squash(exit.cause);
          if (error instanceof ORPCError) {
            throw error;
          }
          throw new ORPCError('INTERNAL_SERVER_ERROR', {
            message: error instanceof Error ? error.message : String(error),
          });
        }

        return exit.value;
      }),

      deleteCategory: builder.deleteCategory.handler(async ({ input }) => {
        const exit = await Effect.runPromiseExit(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.deleteCategory(input.id);
          }).pipe(Effect.provide(appLayer))
        );

        if (Exit.isFailure(exit)) {
          const error = Cause.squash(exit.cause);
          if (error instanceof ORPCError) {
            throw error;
          }
          throw new ORPCError('INTERNAL_SERVER_ERROR', {
            message: error instanceof Error ? error.message : String(error),
          });
        }

        return exit.value;
      }),

      updateProductCategories: builder.updateProductCategories.handler(async ({ input }) => {
        const exit = await Effect.runPromiseExit(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.updateProductCollections(input.id, input.categoryIds);
          }).pipe(Effect.provide(appLayer))
        );

        if (Exit.isFailure(exit)) {
          const error = Cause.squash(exit.cause);
          if (error instanceof ORPCError) {
            throw error;
          }
          throw new ORPCError('INTERNAL_SERVER_ERROR', {
            message: error instanceof Error ? error.message : String(error),
          });
        }

        return exit.value;
      }),

      updateProductTags: builder.updateProductTags.handler(async ({ input }) => {
        const exit = await Effect.runPromiseExit(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.updateProductTags(input.id, input.tags);
          }).pipe(Effect.provide(appLayer))
        );

        if (Exit.isFailure(exit)) {
          const error = Cause.squash(exit.cause);
          if (error instanceof ORPCError) {
            throw error;
          }
          throw new ORPCError('INTERNAL_SERVER_ERROR', {
            message: error instanceof Error ? error.message : String(error),
          });
        }

        return exit.value;
      }),

      updateProductFeatured: builder.updateProductFeatured.handler(async ({ input }) => {
        const exit = await Effect.runPromiseExit(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.updateProductFeatured(input.id, input.featured);
          }).pipe(Effect.provide(appLayer))
        );

        if (Exit.isFailure(exit)) {
          const error = Cause.squash(exit.cause);
          if (error instanceof ORPCError) {
            throw error;
          }
          throw new ORPCError('INTERNAL_SERVER_ERROR', {
            message: error instanceof Error ? error.message : String(error),
          });
        }

        return exit.value;
      }),

      updateProductType: builder.updateProductType.handler(async ({ input }) => {
        const exit = await Effect.runPromiseExit(
          Effect.gen(function* () {
            const productStore = yield* ProductStore;
            const product = yield* productStore.updateProductType(input.id, input.productTypeSlug);
            if (!product) {
              return { success: false };
            }
            return { success: true, product };
          }).pipe(Effect.provide(productStoreLayer))
        );

        if (Exit.isFailure(exit)) {
          const error = Cause.squash(exit.cause);
          if (error instanceof ORPCError) {
            throw error;
          }
          throw new ORPCError('INTERNAL_SERVER_ERROR', {
            message: error instanceof Error ? error.message : String(error),
          });
        }

        return exit.value;
      }),

      getProductTypes: builder.getProductTypes.handler(async () => {
        const exit = await Effect.runPromiseExit(
          Effect.gen(function* () {
            const store = yield* ProductTypeStore;
            const productTypes = yield* store.findAll();
            return { productTypes };
          }).pipe(Effect.provide(productTypeLayer))
        );

        if (Exit.isFailure(exit)) {
          const error = Cause.squash(exit.cause);
          if (error instanceof ORPCError) {
            throw error;
          }
          throw new ORPCError('INTERNAL_SERVER_ERROR', {
            message: error instanceof Error ? error.message : String(error),
          });
        }

        return exit.value;
      }),

      createProductType: builder.createProductType.handler(async ({ input }) => {
        const exit = await Effect.runPromiseExit(
          Effect.gen(function* () {
            const store = yield* ProductTypeStore;
            const productType = yield* store.create(input);
            return { productType };
          }).pipe(Effect.provide(productTypeLayer))
        );

        if (Exit.isFailure(exit)) {
          const error = Cause.squash(exit.cause);
          if (error instanceof ORPCError) {
            throw error;
          }
          throw new ORPCError('INTERNAL_SERVER_ERROR', {
            message: error instanceof Error ? error.message : String(error),
          });
        }

        return exit.value;
      }),

      updateProductTypeItem: builder.updateProductTypeItem.handler(async ({ input }) => {
        const exit = await Effect.runPromiseExit(
          Effect.gen(function* () {
            const store = yield* ProductTypeStore;
            const productType = yield* store.update(input.slug, {
              label: input.label,
              description: input.description,
              displayOrder: input.displayOrder,
            });
            return { productType };
          }).pipe(Effect.provide(productTypeLayer))
        );

        if (Exit.isFailure(exit)) {
          const error = Cause.squash(exit.cause);
          if (error instanceof ORPCError) {
            throw error;
          }
          throw new ORPCError('INTERNAL_SERVER_ERROR', {
            message: error instanceof Error ? error.message : String(error),
          });
        }

        return exit.value;
      }),

      deleteProductType: builder.deleteProductType.handler(async ({ input }) => {
        const exit = await Effect.runPromiseExit(
          Effect.gen(function* () {
            const store = yield* ProductTypeStore;
            const success = yield* store.delete(input.slug);
            return { success };
          }).pipe(Effect.provide(productTypeLayer))
        );

        if (Exit.isFailure(exit)) {
          const error = Cause.squash(exit.cause);
          if (error instanceof ORPCError) {
            throw error;
          }
          throw new ORPCError('INTERNAL_SERVER_ERROR', {
            message: error instanceof Error ? error.message : String(error),
          });
        }

        return exit.value;
      }),
    };
  },
});
