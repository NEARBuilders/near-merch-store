import { createPlugin } from 'every-plugin';
import { Effect, Layer } from 'every-plugin/effect';
import { ORPCError } from 'every-plugin/orpc';
import { z } from 'every-plugin/zod';
import { contract } from './contract';
import { createMarketplaceRuntime } from './runtime';
import { ReturnAddressSchema, type OrderStatus, type TrackingInfo } from './schema';
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
    DATABASE_URL: z.string().default('file:./marketplace.db'),
    DATABASE_AUTH_TOKEN: z.string().optional(),
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
        createMarketplaceRuntime({
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
        })
      );

      const dbLayer = DatabaseLive(config.secrets.DATABASE_URL, config.secrets.DATABASE_AUTH_TOKEN);

      const appLayer = ProductServiceLive(runtime).pipe(
        Layer.provide(ProductStoreLive),
        Layer.provide(dbLayer)
      );

      const orderLayer = OrderStoreLive.pipe(Layer.provide(dbLayer));

      console.log('[Marketplace] Plugin initialized');
      console.log(`[Marketplace] Database: ${config.secrets.DATABASE_URL}`);
      console.log(`[Marketplace] Providers: ${runtime.providers.map((p) => p.name).join(', ') || 'none'}`);
      console.log(`[Marketplace] Stripe: ${stripeService ? 'configured' : 'not configured'}`);

      return {
        stripeService,
        runtime,
        appLayer,
        orderLayer,
        secrets: config.secrets,
      };
    }),

  shutdown: (context) =>
    Effect.gen(function* () {
      yield* Effect.promise(() => context.runtime.shutdown());
    }),

  createRouter: (context, builder) => {
    const { stripeService, runtime, appLayer, orderLayer, secrets } = context;

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

      createCheckout: builder.createCheckout
        .use(requireAuth)
        .handler(async ({ input, context }) => {
          if (!stripeService) {
            throw new Error('Stripe is not configured');
          }

          if (!input.items || input.items.length === 0) {
            throw new Error('At least one item is required');
          }

          const firstItem = input.items[0]!;
          const productResult = await Effect.runPromise(
            Effect.gen(function* () {
              const service = yield* ProductService;
              return yield* service.getProduct(firstItem.productId);
            }).pipe(Effect.provide(appLayer))
          );
          const product = productResult.product;

          const selectedVariant = firstItem.variantId
            ? product.variants.find(v => v.id === firstItem.variantId)
            : product.variants[0];

          const unitPrice = selectedVariant?.price ?? product.price;
          const currency = selectedVariant?.currency ?? product.currency ?? 'USD';

          const userId = context.nearAccountId;
          const totalAmount = unitPrice * firstItem.quantity;

          const order = await Effect.runPromise(
            Effect.gen(function* () {
              const store = yield* OrderStore;
              return yield* store.create({
                userId,
                items: [{
                  productId: product.id,
                  variantId: selectedVariant?.id,
                  productName: product.title,
                  variantName: selectedVariant?.title,
                  quantity: firstItem.quantity,
                  unitPrice,
                  fulfillmentProvider: product.fulfillmentProvider,
                  fulfillmentConfig: selectedVariant?.fulfillmentConfig,
                }],
                totalAmount,
                currency,
              });
            }).pipe(Effect.provide(orderLayer))
          );

          const checkout = await Effect.runPromise(
            stripeService.createCheckoutSession({
              orderId: order.id,
              productName: product.title,
              productDescription: product.description,
              productImage: product.images[0]?.url,
              unitAmount: Math.round(unitPrice * 100),
              currency,
              quantity: firstItem.quantity,
              successUrl: input.successUrl,
              cancelUrl: input.cancelUrl,
            })
          );

          await Effect.runPromise(
            Effect.gen(function* () {
              const store = yield* OrderStore;
              return yield* store.updateCheckout(order.id, checkout.sessionId, 'stripe');
            }).pipe(Effect.provide(orderLayer))
          );

          return {
            checkoutSessionId: checkout.sessionId,
            checkoutUrl: checkout.url,
            orderId: order.id,
          };
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

          if (orderId) {
            const fullSession = await Effect.runPromise(
              stripeService.getCheckoutSession(session.id)
            );

            const shippingAddress = stripeService.extractShippingAddress(fullSession);

            if (shippingAddress) {
              await Effect.runPromise(
                Effect.gen(function* () {
                  const store = yield* OrderStore;
                  yield* store.updateShipping(orderId, shippingAddress);
                  yield* store.updateStatus(orderId, 'paid');
                }).pipe(Effect.provide(orderLayer))
              );

              const order = await Effect.runPromise(
                Effect.gen(function* () {
                  const store = yield* OrderStore;
                  return yield* store.find(orderId);
                }).pipe(Effect.provide(orderLayer))
              );

              if (order && order.items.length > 0) {
                const firstItem = order.items[0]!;
                const fulfillmentProvider = firstItem.fulfillmentProvider || 'manual';

                try {
                  const provider = fulfillmentProvider !== 'manual'
                    ? runtime.getProvider(fulfillmentProvider)
                    : null;

                  if (provider) {
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
                      items: order.items.map(item => {
                        const config = item.fulfillmentConfig;
                        const providerData = config?.providerData as Record<string, unknown> | undefined;
                        return {
                          externalVariantId: config?.externalVariantId || undefined,
                          variantId: providerData?.syncVariantId as number | undefined,
                          productId: providerData?.catalogProductId as number | undefined,
                          quantity: item.quantity,
                          files: config?.designFiles?.length
                            ? config.designFiles.map(df => ({ url: df.url, type: 'default', placement: df.placement }))
                            : undefined,
                        };
                      }),
                      retailCosts: {
                        currency: order.currency,
                      },
                    });

                    await Effect.runPromise(
                      Effect.gen(function* () {
                        const store = yield* OrderStore;
                        yield* store.updateFulfillment(orderId, fulfillmentOrder.id);
                      }).pipe(Effect.provide(orderLayer))
                    );
                  } else {
                    console.log('[Fulfillment] Manual fulfillment - no automated order creation');
                  }
                } catch (error) {
                  console.error('Failed to create fulfillment order:', error);
                }
              }
            } else {
              await Effect.runPromise(
                Effect.gen(function* () {
                  const store = yield* OrderStore;
                  yield* store.updateStatus(orderId, 'paid');
                }).pipe(Effect.provide(orderLayer))
              );
            }
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
    };
  },
});
