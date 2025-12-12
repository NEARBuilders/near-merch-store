import { createPlugin } from 'every-plugin';
import { Effect, Layer } from 'every-plugin/effect';
import { z } from 'every-plugin/zod';
import { InMemoryKeyStore, Near, parseKey, type Network } from 'near-kit';

import { contract } from './contract';
import { createMarketplaceRuntime } from './runtime';
import { RelayerService } from './service';
import { OrderService } from './services/orders';
import { ProductService, ProductServiceLive } from './services/products';
import { StripeService } from './services/stripe';
import { DatabaseLive, ProductStoreLive } from './store';

export * from './schema';

export const ReturnAddressSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  companyName: z.string().optional(),
  addressLine1: z.string(),
  addressLine2: z.string().optional(),
  city: z.string(),
  state: z.string(),
  postCode: z.string(),
  country: z.string(),
  email: z.string(),
  phone: z.string().optional(),
});

export default createPlugin({
  variables: z.object({
    network: z.enum(['mainnet', 'testnet']).default('mainnet'),
    contractId: z.string().default('social.near'),
    nodeUrl: z.string().optional(),
    returnAddress: ReturnAddressSchema.optional(),
  }),

  secrets: z.object({
    RELAYER_ACCOUNT_ID: z.string().min(1, 'Relayer account ID is required'),
    RELAYER_PRIVATE_KEY: z.string().min(1, 'Relayer private key is required'),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    GELATO_API_KEY: z.string().optional(),
    GELATO_WEBHOOK_SECRET: z.string().optional(),
    PRINTFUL_API_KEY: z.string().optional(),
    PRINTFUL_STORE_ID: z.string().optional(),
    PRINTFUL_WEBHOOK_SECRET: z.string().optional(),
    DATABASE_URL: z.string().default('file:./marketplace.db'),
    DATABASE_AUTH_TOKEN: z.string().optional(),
  }),

  contract,

  initialize: (config) =>
    Effect.gen(function* () {
      const networkConfig = config.variables.nodeUrl
        ? {
          networkId: config.variables.network,
          rpcUrl: config.variables.nodeUrl,
        }
        : (config.variables.network as Network);

      const keyStore = new InMemoryKeyStore();
      yield* Effect.promise(() =>
        keyStore.add(
          config.secrets.RELAYER_ACCOUNT_ID,
          parseKey(config.secrets.RELAYER_PRIVATE_KEY)
        )
      );

      const near = new Near({
        network: networkConfig,
        keyStore,
        defaultSignerId: config.secrets.RELAYER_ACCOUNT_ID,
        defaultWaitUntil: 'FINAL',
      });

      const relayerService = new RelayerService(
        near,
        config.secrets.RELAYER_ACCOUNT_ID,
        config.variables.contractId
      );

      const stripeService =
        config.secrets.STRIPE_SECRET_KEY && config.secrets.STRIPE_WEBHOOK_SECRET
          ? new StripeService(config.secrets.STRIPE_SECRET_KEY, config.secrets.STRIPE_WEBHOOK_SECRET)
          : null;

      const runtime = yield* Effect.promise(() =>
        createMarketplaceRuntime({
          printful: config.secrets.PRINTFUL_API_KEY
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
        })
      );

      const dbLayer = DatabaseLive(config.secrets.DATABASE_URL, config.secrets.DATABASE_AUTH_TOKEN);

      const appLayer = ProductServiceLive(runtime).pipe(
        Layer.provide(ProductStoreLive),
        Layer.provide(dbLayer)
      );

      const orderService = new OrderService();

      console.log('[Marketplace] Plugin initialized');
      console.log(`[Marketplace] Database: ${config.secrets.DATABASE_URL}`);
      console.log(`[Marketplace] Providers: ${runtime.providers.map((p) => p.name).join(', ') || 'none'}`);
      console.log(`[Marketplace] Stripe: ${stripeService ? 'configured' : 'not configured'}`);

      return {
        relayerService,
        orderService,
        stripeService,
        runtime,
        appLayer,
        secrets: config.secrets,
      };
    }),

  shutdown: (context) =>
    Effect.gen(function* () {
      yield* Effect.promise(() => context.runtime.shutdown());
    }),

  createRouter: (context, builder) => {
    const { relayerService, orderService, stripeService, runtime, appLayer } = context;

    return {
      connect: builder.connect.handler(async ({ input }) => {
        return await relayerService.ensureStorageDeposit(input.accountId);
      }),

      publish: builder.publish.handler(async ({ input }) => {
        return await relayerService.submitDelegateAction(input.payload);
      }),

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

      createCheckout: builder.createCheckout.handler(async ({ input }) => {
        if (!stripeService) {
          throw new Error('Stripe is not configured');
        }

        const productResult = await Effect.runPromise(
          Effect.gen(function* () {
            const service = yield* ProductService;
            return yield* service.getProduct(input.productId);
          }).pipe(Effect.provide(appLayer))
        );
        const product = productResult.product;

        const userId = 'demo-user';
        const totalAmount = product.price * 100 * input.quantity;

        const order = await Effect.runPromise(
          orderService.createOrder({
            userId,
            productId: product.id,
            productName: product.name,
            quantity: input.quantity,
            totalAmount,
            currency: product.currency || 'USD',
          })
        );

        const checkout = await Effect.runPromise(
          stripeService.createCheckoutSession({
            orderId: order.id,
            productName: product.name,
            productDescription: product.description,
            productImage: product.primaryImage || product.images[0]?.url,
            unitAmount: product.price * 100,
            currency: product.currency || 'USD',
            quantity: input.quantity,
            successUrl: input.successUrl,
            cancelUrl: input.cancelUrl,
          })
        );

        await Effect.runPromise(
          orderService.updateOrderCheckout(order.id, checkout.sessionId, 'stripe')
        );

        return {
          checkoutSessionId: checkout.sessionId,
          checkoutUrl: checkout.url,
          orderId: order.id,
        };
      }),

      getOrders: builder.getOrders.handler(async ({ input }) => {
        const userId = 'demo-user';
        return await Effect.runPromise(orderService.getOrders(userId, input));
      }),

      getOrder: builder.getOrder.handler(async ({ input }) => {
        const userId = 'demo-user';
        return await Effect.runPromise(orderService.getOrder(input.id, userId));
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

          if (orderId) {
            const fullSession = await Effect.runPromise(
              stripeService.getCheckoutSession(session.id)
            );

            const shippingAddress = stripeService.extractShippingAddress(fullSession);

            if (shippingAddress) {
              await Effect.runPromise(orderService.updateOrderShipping(orderId, shippingAddress));
              await Effect.runPromise(orderService.updateOrderStatus(orderId, 'paid'));

              const orderResult = await Effect.runPromise(orderService.getOrder(orderId));
              const order = orderResult.order;

              const productResult = await Effect.runPromise(
                Effect.gen(function* () {
                  const service = yield* ProductService;
                  return yield* service.getProduct(order.productId);
                }).pipe(Effect.provide(appLayer))
              );
              const product = productResult.product;

              try {
                const provider = product.fulfillmentProvider
                  ? runtime.getProvider(product.fulfillmentProvider)
                  : null;

                if (provider && product.fulfillmentProvider !== 'manual') {
                  const fulfillmentOrder = await provider.client.createOrder({
                    externalId: order.id,
                    recipient: {
                      name: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
                      company: shippingAddress.companyName,
                      address1: shippingAddress.addressLine1,
                      address2: shippingAddress.addressLine2,
                      city: shippingAddress.city,
                      stateCode: shippingAddress.state,
                      countryCode: shippingAddress.country,
                      zip: shippingAddress.postCode,
                      phone: shippingAddress.phone,
                      email: shippingAddress.email,
                    },
                    items: [
                      {
                        variantId: product.fulfillmentConfig?.printfulVariantId,
                        productId: product.fulfillmentConfig?.gelatoProductUid
                          ? parseInt(product.fulfillmentConfig.gelatoProductUid)
                          : undefined,
                        quantity: order.quantity,
                        files: product.fulfillmentConfig?.fileUrl
                          ? [
                              {
                                url: product.fulfillmentConfig.fileUrl,
                                type: 'default',
                                placement: 'front',
                              },
                            ]
                          : undefined,
                      },
                    ],
                    retailCosts: {
                      currency: order.currency,
                    },
                  });
                  await Effect.runPromise(
                    orderService.updateOrderFulfillment(orderId, fulfillmentOrder.id)
                  );
                } else if (product.fulfillmentProvider === 'manual') {
                  console.log('[Fulfillment] Manual fulfillment - no automated order creation');
                }
              } catch (error) {
                console.error('Failed to create fulfillment order:', error);
              }
            } else {
              await Effect.runPromise(orderService.updateOrderStatus(orderId, 'paid'));
            }
          }
        }

        return { received: true };
      }),
    };
  },
});
