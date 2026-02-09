import * as crypto from 'crypto';
import { createPlugin } from 'every-plugin';
import { Effect, Layer, Schedule, Cause, Exit } from 'every-plugin/effect';
import { ManagedRuntime } from 'every-plugin/effect';
import { ORPCError } from 'every-plugin/orpc';
import { z } from 'every-plugin/zod';
import { contract } from './contract';
import { cleanupAbandonedDrafts } from './jobs/cleanup-drafts';
import { createMarketplaceRuntime } from './runtime';
import { ReturnAddressSchema, type OrderStatus, type TrackingInfo } from './schema';
import { CheckoutService, CheckoutServiceLive } from './services/checkout';
import { CheckoutError } from './services/checkout/errors';
import { ProductService, ProductServiceLive } from './services/products';
import { StripeService } from './services/stripe';
import { NewsletterService, NewsletterServiceLive } from './services/newsletter';
import { DatabaseLive, OrderStore, OrderStoreLive, ProductStore, ProductStoreLive, ProductTypeStore, ProductTypeStoreLive, CollectionStoreLive } from './store';
import { NewsletterStoreLive } from './store/newsletter';
import { ProviderConfigStore, ProviderConfigStoreLive } from './store/providers';
import { computePrintfulUpdate, parsePrintfulWebhook, verifyPrintfulWebhookSignature } from './services/fulfillment/printful/webhook';
import { handlePingPayWebhookEffect } from './services/payment/pingpay/webhook';
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
    getRawBody: z.custom<() => Promise<string>>().optional(),
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

      const storesLayer = Layer.provideMerge(
        Layer.mergeAll(
          ProductStoreLive,
          CollectionStoreLive,
          OrderStoreLive,
          ProviderConfigStoreLive,
          ProductTypeStoreLive,
          NewsletterStoreLive
        ),
        dbLayer
      );

      const servicesLayer = Layer.provideMerge(
        Layer.mergeAll(
          ProductServiceLive(runtime),
          CheckoutServiceLive(runtime),
          NewsletterServiceLive
        ),
        storesLayer
      );

      const combinedLayer = Layer.mergeAll(storesLayer, servicesLayer);

      const managedRuntime = ManagedRuntime.make(combinedLayer);

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
        managedRuntime,
        secrets: config.secrets,
        nearPriceCache,
      };
    }),

  shutdown: (context) =>
    Effect.tryPromise({
      try: async () => {
        await context.runtime.shutdown();
        await context.managedRuntime.dispose();
      },
      catch: (e) => new Error(`Shutdown failed: ${e instanceof Error ? e.message : String(e)}`),
    }),

  createRouter: (context, builder) => {
    const { stripeService, runtime, managedRuntime, secrets, nearPriceCache } = context;

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

      subscribeNewsletter: builder.subscribeNewsletter.handler(async ({ input }) => {
        const email = input.email.trim().toLowerCase();
        if (!email) {
          throw new ORPCError('BAD_REQUEST', { message: 'Please enter a valid email address' });
        }

        const exit = await managedRuntime.runPromiseExit(
          Effect.gen(function* () {
            const service = yield* NewsletterService;
            return yield* service.subscribe(email);
          })
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

        return {
          success: true,
          status: exit.value.status,
        };
      }),

      getProducts: builder.getProducts.handler(async ({ input }) => {
        const exit = await managedRuntime.runPromiseExit(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.getProducts(input);
          })
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
        const exit = await managedRuntime.runPromiseExit(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.getProduct(input.id);
          })
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
        const exit = await managedRuntime.runPromiseExit(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.searchProducts(input);
          })
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
        const exit = await managedRuntime.runPromiseExit(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.getFeaturedProducts(input.limit);
          })
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
        const exit = await managedRuntime.runPromiseExit(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.getCollections();
          })
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
        const exit = await managedRuntime.runPromiseExit(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.getCollection(input.slug);
          })
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
        const exit = await managedRuntime.runPromiseExit(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.getCarouselCollections();
          })
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
        const exit = await managedRuntime.runPromiseExit(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.updateCollection(slug, data);
          })
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
        const exit = await managedRuntime.runPromiseExit(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.updateCollectionFeaturedProduct(input.slug, input.productId);
          })
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
          return await managedRuntime.runPromise(
            Effect.gen(function* () {
              const service = yield* ProductService;
              return yield* service.sync();
            })
          );
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          const getSyncStatusWithLayer = async () => {
            return await managedRuntime.runPromise(
              Effect.gen(function* () {
                const service = yield* ProductService;
                return yield* service.getSyncStatus();
              })
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
        const exit = await managedRuntime.runPromiseExit(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.getSyncStatus();
          })
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
        const exit = await managedRuntime.runPromiseExit(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.updateProductListing(input.id, input.listed);
          })
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
          const exit = await managedRuntime.runPromiseExit(
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
            })
          );

          if (Exit.isFailure(exit)) {
            const error = Cause.squash(exit.cause);
            if (error instanceof ORPCError) {
              throw error;
            }

            // Don't leak provider/internal details to the UI.
            if (error instanceof CheckoutError) {
              console.error('[createCheckout] Checkout failed:', error.message);
              if (error.cause) console.error('[createCheckout] Cause:', error.cause);

              throw new ORPCError('INTERNAL_SERVER_ERROR', {
                message: 'Order Failed, please contact support (merch@near.foundation)',
              });
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
        const exit = await managedRuntime.runPromiseExit(
          Effect.gen(function* () {
            const service = yield* CheckoutService;
            return yield* service.getQuote(input.items, input.shippingAddress);
          })
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
          const exit = await managedRuntime.runPromiseExit(
            Effect.gen(function* () {
              const store = yield* OrderStore;
              return yield* store.findByUser(context.nearAccountId!, input);
            })
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
          const exit = await managedRuntime.runPromiseExit(
            Effect.gen(function* () {
              const store = yield* OrderStore;
              return yield* store.find(input.id);
            })
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
        const exit = await managedRuntime.runPromiseExit(
          Effect.gen(function* () {
            const store = yield* OrderStore;
            return yield* store.findByCheckoutSession(input.sessionId);
          })
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
          const order = await managedRuntime.runPromise(
            Effect.gen(function* () {
              const store = yield* OrderStore;
              return yield* store.findByCheckoutSession(input.sessionId);
            })
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
          const exit = await managedRuntime.runPromiseExit(
            Effect.gen(function* () {
              const store = yield* OrderStore;
              return yield* store.findAll({
                limit: input.limit,
                offset: input.offset,
                status: input.status,
                search: input.search,
              });
            })
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

        const event = await managedRuntime.runPromise(
          stripeService.verifyWebhookSignature(input.body, input.signature)
        );

        if (event.type === 'checkout.session.completed') {
          const session = event.data.object;
          const orderId = session.metadata?.orderId;
          const draftOrderIdsJson = session.metadata?.draftOrderIds;

          if (!orderId) {
            return { received: true };
          }

          const order = await managedRuntime.runPromise(
            Effect.gen(function* () {
              const store = yield* OrderStore;
              return yield* store.find(orderId);
            })
          );

          if (!order) {
            return { received: true };
          }

          if (order.status !== 'draft_created' && order.status !== 'pending') {
            return { received: true };
          }

          await managedRuntime.runPromise(
            Effect.gen(function* () {
              const store = yield* OrderStore;
              yield* store.updateStatus(orderId, 'paid');
            })
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
                const result = await managedRuntime.runPromise(confirmEffect);
                confirmationResults[providerName] = { success: true };
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                confirmationResults[providerName] = { success: false, error: errorMessage };
              }
            }

            const allSuccess = Object.values(confirmationResults).every(r => r.success);
            const finalStatus = allSuccess ? 'processing' : 'paid_pending_fulfillment';

            await managedRuntime.runPromise(
              Effect.gen(function* () {
                const store = yield* OrderStore;
                yield* store.updateStatus(orderId, finalStatus);
              })
            );
          } catch (error) {
            await managedRuntime.runPromise(
              Effect.gen(function* () {
                const store = yield* OrderStore;
                yield* store.updateStatus(orderId, 'paid_pending_fulfillment');
              })
            );
          }
        }

        return { received: true };
      }),

      printfulWebhook: builder.printfulWebhook.handler(async ({ input, context }) => {
        const signature = context.reqHeaders?.get('x-pf-webhook-signature') || '';
        const rawBody = (await context.getRawBody?.()) ?? JSON.stringify(input as unknown);

        try {
          // Secret source of truth: DB (configured via admin UI). Env is a fallback.
          const webhookSecret = await managedRuntime.runPromise(
            Effect.gen(function* () {
              const store = yield* ProviderConfigStore;
              return (yield* store.getSecretKey('printful')) || secrets.PRINTFUL_WEBHOOK_SECRET;
            })
          );

          if (webhookSecret) {
            verifyPrintfulWebhookSignature({ rawBody, signature, webhookSecretHex: webhookSecret });
          }

          const { eventType, externalId, data } = parsePrintfulWebhook(rawBody);
          if (!externalId) {
            return { received: true };
          }

          console.log(`[Printful Webhook] Processing event: ${eventType}, external_id: ${externalId}`);

          const order = await managedRuntime.runPromise(
            Effect.gen(function* () {
              const store = yield* OrderStore;
              let order = yield* store.findByFulfillmentRef(externalId);
              if (!order) {
                order = yield* store.find(externalId);
              }
              return order;
            })
          );

          if (!order) {
            return { received: true };
          }

          const { newStatus, newTracking } = computePrintfulUpdate({
            eventType,
            data,
            currentStatus: order.status,
          });

          if (newStatus && order) {
            const statusToUpdate = newStatus;
            await managedRuntime.runPromise(
              Effect.gen(function* () {
                const store = yield* OrderStore;
                yield* store.updateStatus(order.id, statusToUpdate);
              })
            );
          }

          if (newTracking && order) {
            const trackingToUpdate = newTracking;
            await managedRuntime.runPromise(
              Effect.gen(function* () {
                const store = yield* OrderStore;
                yield* store.updateTracking(order.id, trackingToUpdate);
              })
            );
          }
        } catch (error) {
          if (error instanceof ORPCError) {
            console.error(`[Printful Webhook] ORPC error:`, error);
            throw error;
          }

          // Log other errors but don't throw - return 200 to avoid webhook retries
          console.error(`[Printful Webhook] Processing error:`, error);
        }

        return { received: true };
      }),

      gelatoWebhook: builder.gelatoWebhook.handler(async ({ input, context }) => {
        try {
          const rawBody = (await context.getRawBody?.()) ?? JSON.stringify(input as unknown);
          const payload = JSON.parse(rawBody);
          const eventType = payload.event;
          const orderData = payload.order || payload;

          const externalId = orderData.orderReferenceId || orderData.externalId;
          if (!externalId) {
            return { received: true };
          }

          const order = await managedRuntime.runPromise(
            Effect.gen(function* () {
              const store = yield* OrderStore;
              let order = yield* store.findByFulfillmentRef(externalId);
              if (!order) {
                order = yield* store.find(externalId);
              }
              return order;
            })
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

          if (newStatus && order) {
            const statusToUpdate = newStatus;
            await managedRuntime.runPromise(
              Effect.gen(function* () {
                const store = yield* OrderStore;
                yield* store.updateStatus(order.id, statusToUpdate);
              })
            );
          }

          if (newTracking && order) {
            const trackingToUpdate = newTracking;
            await managedRuntime.runPromise(
              Effect.gen(function* () {
                const store = yield* OrderStore;
                yield* store.updateTracking(order.id, trackingToUpdate);
              })
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
        const body = (await context.getRawBody?.()) ?? JSON.stringify(input as unknown);

        await managedRuntime.runPromise(
          handlePingPayWebhookEffect({
            runtime,
            pingProvider,
            signature,
            timestamp,
            body,
          })
        );

        return { received: true };
      }),

      cleanupAbandonedDrafts: builder.cleanupAbandonedDrafts.handler(async ({ input, context }) => {
        const cronSecret = context.reqHeaders?.get('x-cron-secret');
        const expectedSecret = process.env.CRON_SECRET;

        if (!expectedSecret || cronSecret !== expectedSecret) {
          throw new ORPCError('UNAUTHORIZED', { message: 'Invalid or missing cron secret' });
        }

        const maxAgeHours = input?.maxAgeHours || 24;
        const exit = await managedRuntime.runPromiseExit(
          cleanupAbandonedDrafts(runtime, maxAgeHours)
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
          const exit = await managedRuntime.runPromiseExit(
            Effect.gen(function* () {
              const store = yield* ProviderConfigStore;
              return yield* store.getConfig(input.provider);
            })
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
            result = await managedRuntime.runPromise(
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
            await managedRuntime.runPromise(
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
              })
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
            await managedRuntime.runPromise(printfulService.disableWebhooks());
          } catch (error) {
            console.error('[disableWebhook] Failed to disable Printful webhooks:', error);
            throw new ORPCError('INTERNAL_SERVER_ERROR', {
              message: error instanceof Error ? error.message : 'Failed to disable webhook',
            });
          }

          try {
            await managedRuntime.runPromise(
              Effect.gen(function* () {
                const store = yield* ProviderConfigStore;
                yield* store.clearWebhookConfig(input.provider);
              })
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
            const result = await managedRuntime.runPromise(printfulService.ping());
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
        const exit = await managedRuntime.runPromiseExit(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.getCategories();
          })
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
        const exit = await managedRuntime.runPromiseExit(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.createCategory(input);
          })
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
        const exit = await managedRuntime.runPromiseExit(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.deleteCategory(input.id);
          })
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
        const exit = await managedRuntime.runPromiseExit(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.updateProductCollections(input.id, input.categoryIds);
          })
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
        const exit = await managedRuntime.runPromiseExit(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.updateProductTags(input.id, input.tags);
          })
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
        const exit = await managedRuntime.runPromiseExit(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.updateProductFeatured(input.id, input.featured);
          })
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
        const exit = await managedRuntime.runPromiseExit(
          Effect.gen(function* () {
            const productStore = yield* ProductStore;
            const product = yield* productStore.updateProductType(input.id, input.productTypeSlug);
            if (!product) {
              return { success: false };
            }
            return { success: true, product };
          })
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
        const exit = await managedRuntime.runPromiseExit(
          Effect.gen(function* () {
            const store = yield* ProductTypeStore;
            const productTypes = yield* store.findAll();
            return { productTypes };
          })
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
        const exit = await managedRuntime.runPromiseExit(
          Effect.gen(function* () {
            const store = yield* ProductTypeStore;
            const productType = yield* store.create(input);
            return { productType };
          })
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
        const exit = await managedRuntime.runPromiseExit(
          Effect.gen(function* () {
            const store = yield* ProductTypeStore;
            const productType = yield* store.update(input.slug, {
              label: input.label,
              description: input.description,
              displayOrder: input.displayOrder,
            });
            return { productType };
          })
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
        const exit = await managedRuntime.runPromiseExit(
          Effect.gen(function* () {
            const store = yield* ProductTypeStore;
            const success = yield* store.delete(input.slug);
            return { success };
          })
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
