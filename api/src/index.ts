import { createPlugin } from 'every-plugin';
import { Effect, Layer } from 'every-plugin/effect';
import { z } from 'every-plugin/zod';
import { Near, InMemoryKeyStore, parseKey, type Network } from 'near-kit';

import { contract } from './contract';
import { RelayerService } from './service';
import { ProductService, ProductServiceLive } from './services/products';
import { OrderService } from './services/orders';
import { StripeService } from './services/stripe';
import {
  GelatoFulfillmentService,
  PrintfulFulfillmentService,
  mapFulfillmentStatus,
  mapPrintfulStatus,
  parseTrackingInfo,
  parsePrintfulTrackingInfo,
} from './services/fulfillment';
import { ProductStore, ProductStoreLive, DatabaseLive } from './store';

import type { ShippingAddress } from './schema';

export * from './schema';

const ReturnAddressSchema = z.object({
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
    relayerAccountId: z.string().min(1, 'Relayer account ID is required'),
    relayerPrivateKey: z.string().min(1, 'Relayer private key is required'),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    GELATO_API_KEY: z.string().optional(),
    GELATO_WEBHOOK_SECRET: z.string().optional(),
    PRINTFUL_API_KEY: z.string().optional(),
    PRINTFUL_STORE_ID: z.string().optional(),
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
          config.secrets.relayerAccountId,
          parseKey(config.secrets.relayerPrivateKey)
        )
      );

      const near = new Near({
        network: networkConfig,
        keyStore,
        defaultSignerId: config.secrets.relayerAccountId,
        defaultWaitUntil: 'FINAL',
      });

      const relayerService = new RelayerService(
        near,
        config.secrets.relayerAccountId,
        config.variables.contractId
      );

      const stripeService = config.secrets.STRIPE_SECRET_KEY && config.secrets.STRIPE_WEBHOOK_SECRET
        ? new StripeService(config.secrets.STRIPE_SECRET_KEY, config.secrets.STRIPE_WEBHOOK_SECRET)
        : null;

      const gelatoService = config.secrets.GELATO_API_KEY && config.secrets.GELATO_WEBHOOK_SECRET
        ? new GelatoFulfillmentService(
            config.secrets.GELATO_API_KEY,
            config.secrets.GELATO_WEBHOOK_SECRET,
            config.variables.returnAddress as ShippingAddress | undefined
          )
        : null;

      const printfulService = config.secrets.PRINTFUL_API_KEY
        ? new PrintfulFulfillmentService(config.secrets.PRINTFUL_API_KEY, config.secrets.PRINTFUL_STORE_ID)
        : null;

      const dbLayer = DatabaseLive(config.secrets.DATABASE_URL, config.secrets.DATABASE_AUTH_TOKEN);

      const appLayer = ProductServiceLive(printfulService).pipe(
        Layer.provide(ProductStoreLive),
        Layer.provide(dbLayer)
      );

      const orderService = new OrderService();

      console.log('[Marketplace] Plugin initialized');
      console.log(`[Marketplace] Database: ${config.secrets.DATABASE_URL}`);
      console.log(`[Marketplace] Printful: ${printfulService ? 'configured' : 'not configured'}`);
      console.log(`[Marketplace] Stripe: ${stripeService ? 'configured' : 'not configured'}`);

      return {
        relayerService,
        orderService,
        stripeService,
        gelatoService,
        printfulService,
        appLayer,
      };
    }),

  shutdown: () => Effect.void,

  createRouter: (context, builder) => {
    const { relayerService, orderService, stripeService, gelatoService, printfulService, appLayer } = context;

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
            productImage: product.image,
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
              await Effect.runPromise(
                orderService.updateOrderShipping(orderId, shippingAddress)
              );
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
                if (product.fulfillmentProvider === 'printful' && printfulService) {
                  const printfulOrderData = printfulService.buildOrderData({
                    orderId: order.id,
                    syncVariantId: product.fulfillmentConfig?.printfulSyncVariantId,
                    variantId: product.fulfillmentConfig?.printfulVariantId,
                    fileUrl: product.fulfillmentConfig?.fileUrl,
                    quantity: order.quantity,
                    shippingAddress,
                  });

                  const fulfillmentResult = await Effect.runPromise(
                    printfulService.createOrder(printfulOrderData, false)
                  );
                  await Effect.runPromise(
                    orderService.updateOrderFulfillment(orderId, fulfillmentResult.id)
                  );
                } else if (product.fulfillmentProvider === 'gelato' && gelatoService) {
                  if (!product.fulfillmentConfig?.gelatoProductUid || !product.fulfillmentConfig?.fileUrl) {
                    throw new Error(`Product ${product.id} is missing Gelato fulfillment config`);
                  }
                  const gelatoOrderData = gelatoService.buildOrderData({
                    orderId: order.id,
                    userId: order.userId,
                    productUid: product.fulfillmentConfig.gelatoProductUid,
                    fileUrl: product.fulfillmentConfig.fileUrl,
                    quantity: order.quantity,
                    currency: order.currency,
                    shippingAddress,
                    fulfillmentReferenceId: order.fulfillmentReferenceId!,
                  });

                  const fulfillmentResult = await Effect.runPromise(
                    gelatoService.createOrder(gelatoOrderData)
                  );
                  await Effect.runPromise(
                    orderService.updateOrderFulfillment(orderId, fulfillmentResult.id)
                  );
                } else if (product.fulfillmentProvider === 'manual') {
                  // Manual fulfillment - no automated order creation needed
                } else if (!product.fulfillmentProvider) {
                  console.error(`[Fulfillment] Product ${product.id} has no fulfillment provider configured`);
                } else {
                  console.error(`[Fulfillment] Unsupported provider: ${product.fulfillmentProvider}`);
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

      fulfillmentWebhook: builder.fulfillmentWebhook.handler(async ({ input }) => {
        const event = JSON.parse(input.body);

        if (event.type && event.type.startsWith('package_') || event.type?.startsWith('order_')) {
          if (!gelatoService) {
            console.warn('[Webhook] No Gelato service configured for webhook');
            return { received: true };
          }

          const isValid = await Effect.runPromise(
            gelatoService.verifyWebhookSignature(input.body, input.signature)
          );

          if (!isValid) {
            throw new Error('Invalid Gelato webhook signature');
          }

          switch (event.event) {
            case 'order_status_updated': {
              const { orderReferenceId, fulfillmentStatus, items } = event;
              const order = await Effect.runPromise(
                orderService.getOrderByFulfillmentReference(orderReferenceId)
              );

              if (order) {
                const status = mapFulfillmentStatus(fulfillmentStatus);
                await Effect.runPromise(orderService.updateOrderStatus(order.id, status));

                const trackingInfo = parseTrackingInfo(items);
                if (trackingInfo.length > 0) {
                  await Effect.runPromise(orderService.updateOrderTracking(order.id, trackingInfo));
                }
              }
              break;
            }

            case 'order_item_tracking_code_updated': {
              const { orderReferenceId, trackingCode, trackingUrl, shipmentMethodName } = event;
              const order = await Effect.runPromise(
                orderService.getOrderByFulfillmentReference(orderReferenceId)
              );

              if (order) {
                const existingTracking = order.trackingInfo || [];
                const newTracking = {
                  trackingCode,
                  trackingUrl,
                  shipmentMethodName,
                };

                const existingIndex = existingTracking.findIndex(
                  (t) => t.trackingCode === trackingCode
                );

                if (existingIndex >= 0) {
                  existingTracking[existingIndex] = { ...existingTracking[existingIndex], ...newTracking };
                } else {
                  existingTracking.push(newTracking);
                }

                await Effect.runPromise(orderService.updateOrderTracking(order.id, existingTracking));
                await Effect.runPromise(orderService.updateOrderStatus(order.id, 'shipped'));
              }
              break;
            }

            case 'order_delivery_estimate_updated': {
              const { orderReferenceId, minDeliveryDate, maxDeliveryDate } = event;
              const order = await Effect.runPromise(
                orderService.getOrderByFulfillmentReference(orderReferenceId)
              );

              if (order) {
                await Effect.runPromise(
                  orderService.updateOrderDeliveryEstimate(order.id, {
                    minDeliveryDate,
                    maxDeliveryDate,
                  })
                );
              }
              break;
            }
          }
        } else if (event.type === 'package_shipped' || event.type === 'order_updated') {
          const orderId = event.data?.order?.external_id;

          if (orderId) {
            const orderResult = await Effect.runPromise(orderService.getOrder(orderId));
            const order = orderResult.order;

            if (event.type === 'package_shipped' && event.data?.shipment) {
              const trackingInfo = parsePrintfulTrackingInfo([event.data.shipment]);
              if (trackingInfo.length > 0) {
                await Effect.runPromise(orderService.updateOrderTracking(order.id, trackingInfo));
              }
              await Effect.runPromise(orderService.updateOrderStatus(order.id, 'shipped'));
            } else if (event.type === 'order_updated' && event.data?.order?.status) {
              const status = mapPrintfulStatus(event.data.order.status);
              await Effect.runPromise(orderService.updateOrderStatus(order.id, status));
            }
          }
        }

        return { received: true };
      }),
    };
  },
});
