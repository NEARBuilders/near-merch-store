import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { Context, Effect, Layer } from "every-plugin/effect";
import * as schema from "../db/schema";
import type { CreateOrderInput, DeliveryEstimate, OrderItem, OrderStatus, OrderWithItems, ShippingAddress, TrackingInfo } from "../schema";
import { Database } from "./database";

export class OrderStore extends Context.Tag("OrderStore")<
  OrderStore,
  {
    readonly create: (input: CreateOrderInput) => Effect.Effect<OrderWithItems, Error>;
    readonly find: (id: string) => Effect.Effect<OrderWithItems | null, Error>;
    readonly findAll: (options: { limit?: number; offset?: number; status?: OrderStatus; search?: string }) => Effect.Effect<{ orders: OrderWithItems[]; total: number }, Error>;
    readonly findByUser: (userId: string, options: { limit?: number; offset?: number }) => Effect.Effect<{ orders: OrderWithItems[]; total: number }, Error>;
    readonly findByCheckoutSession: (checkoutSessionId: string) => Effect.Effect<OrderWithItems | null, Error>;
    readonly findByFulfillmentRef: (fulfillmentReferenceId: string) => Effect.Effect<OrderWithItems | null, Error>;
    readonly findAbandonedDrafts: (olderThanHours: number) => Effect.Effect<OrderWithItems[], Error>;
    readonly updateCheckout: (orderId: string, checkoutSessionId: string, checkoutProvider: 'stripe' | 'near' | 'pingpay') => Effect.Effect<OrderWithItems, Error>;
    readonly updateDraftOrderIds: (orderId: string, draftOrderIds: Record<string, string>) => Effect.Effect<OrderWithItems, Error>;
    readonly updateStatus: (orderId: string, status: OrderStatus) => Effect.Effect<OrderWithItems, Error>;
    readonly updateShipping: (orderId: string, shippingAddress: ShippingAddress) => Effect.Effect<OrderWithItems, Error>;
    readonly updateFulfillment: (orderId: string, fulfillmentOrderId: string) => Effect.Effect<OrderWithItems, Error>;
    readonly updateTracking: (orderId: string, trackingInfo: TrackingInfo[]) => Effect.Effect<OrderWithItems, Error>;
    readonly updateDeliveryEstimate: (orderId: string, deliveryEstimate: DeliveryEstimate) => Effect.Effect<OrderWithItems, Error>;
  }
>() { }

export const OrderStoreLive = Layer.effect(
  OrderStore,
  Effect.gen(function* () {
    const db = yield* Database;

    const getOrderItems = async (orderId: string): Promise<OrderItem[]> => {
      const items = await db
        .select()
        .from(schema.orderItems)
        .where(eq(schema.orderItems.orderId, orderId));

      return items.map((item) => ({
        id: item.id,
        orderId: item.orderId,
        productId: item.productId,
        variantId: item.variantId || undefined,
        productName: item.productName,
        variantName: item.variantName || undefined,
        quantity: item.quantity,
        unitPrice: item.unitPrice / 100,
        attributes: item.attributes || undefined,
        fulfillmentProvider: item.fulfillmentProvider || undefined,
        fulfillmentConfig: item.fulfillmentConfig || undefined,
      }));
    };

    const rowToOrder = async (row: typeof schema.orders.$inferSelect): Promise<OrderWithItems> => {
      const items = await getOrderItems(row.id);

      return {
        id: row.id,
        userId: row.userId,
        status: row.status as OrderStatus,
        totalAmount: row.totalAmount / 100,
        currency: row.currency,
        checkoutSessionId: row.checkoutSessionId || undefined,
        checkoutProvider: row.checkoutProvider === 'stripe' || row.checkoutProvider === 'near' || row.checkoutProvider === 'pingpay'
          ? row.checkoutProvider 
          : undefined,
        draftOrderIds: row.draftOrderIds || undefined,
        shippingMethod: row.shippingMethod || undefined,
        shippingAddress: row.shippingAddress || undefined,
        fulfillmentOrderId: row.fulfillmentOrderId || undefined,
        fulfillmentReferenceId: row.fulfillmentReferenceId || undefined,
        trackingInfo: row.trackingInfo || undefined,
        deliveryEstimate: row.deliveryEstimate || undefined,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        items,
      };
    };

    const findOrderById = async (id: string): Promise<OrderWithItems | null> => {
      const results = await db
        .select()
        .from(schema.orders)
        .where(eq(schema.orders.id, id))
        .limit(1);

      if (results.length === 0) {
        return null;
      }

      return await rowToOrder(results[0]!);
    };

    return {
      create: (input) =>
        Effect.tryPromise({
          try: async () => {
            const now = new Date();
            const orderId = crypto.randomUUID();
            const fulfillmentReferenceId = `order_${Date.now()}_${input.userId}`;

            await db.insert(schema.orders).values({
              id: orderId,
              userId: input.userId,
              status: 'pending',
              totalAmount: Math.round(input.totalAmount * 100),
              currency: input.currency,
              shippingMethod: input.shippingMethod || null,
              fulfillmentReferenceId,
              createdAt: now,
              updatedAt: now,
            });

            if (input.items.length > 0) {
              await db.insert(schema.orderItems).values(
                input.items.map((item, index) => ({
                  id: `${orderId}-item-${index}`,
                  orderId,
                  productId: item.productId,
                  variantId: item.variantId || null,
                  productName: item.productName,
                  variantName: item.variantName || null,
                  quantity: item.quantity,
                  unitPrice: Math.round(item.unitPrice * 100),
                  attributes: item.attributes || null,
                  fulfillmentProvider: item.fulfillmentProvider || null,
                  fulfillmentConfig: item.fulfillmentConfig || null,
                  createdAt: now,
                }))
              );
            }

            const order = await findOrderById(orderId);
            if (!order) {
              throw new Error('Failed to create order');
            }
            return order;
          },
          catch: (error) => new Error(`Failed to create order: ${error}`),
        }),

      find: (id) =>
        Effect.tryPromise({
          try: async () => findOrderById(id),
          catch: (error) => new Error(`Failed to find order: ${error}`),
        }),

      findAll: (options) =>
        Effect.tryPromise({
          try: async () => {
            const { limit = 50, offset = 0, status, search } = options;

            const conditions = [];

            if (status) {
              conditions.push(eq(schema.orders.status, status));
            }

            if (search) {
              conditions.push(
                or(
                  like(schema.orders.id, `%${search}%`),
                  like(schema.orders.userId, `%${search}%`)
                )
              );
            }

            const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

            const countResult = await db
              .select({ count: sql<number>`count(*)` })
              .from(schema.orders)
              .where(whereClause);

            const total = Number(countResult[0]?.count || 0);

            const results = await db
              .select()
              .from(schema.orders)
              .where(whereClause)
              .orderBy(desc(schema.orders.createdAt))
              .limit(limit)
              .offset(offset);

            const orders = await Promise.all(results.map(rowToOrder));

            return { orders, total };
          },
          catch: (error) => new Error(`Failed to find all orders: ${error}`),
        }),

      findByUser: (userId, options) =>
        Effect.tryPromise({
          try: async () => {
            const { limit = 10, offset = 0 } = options;

            const allOrders = await db
              .select()
              .from(schema.orders)
              .where(eq(schema.orders.userId, userId));

            const total = allOrders.length;

            const results = await db
              .select()
              .from(schema.orders)
              .where(eq(schema.orders.userId, userId))
              .orderBy(desc(schema.orders.createdAt))
              .limit(limit)
              .offset(offset);

            const orders = await Promise.all(results.map(rowToOrder));

            return { orders, total };
          },
          catch: (error) => new Error(`Failed to find orders: ${error}`),
        }),

      findByCheckoutSession: (checkoutSessionId) =>
        Effect.tryPromise({
          try: async () => {
            const results = await db
              .select()
              .from(schema.orders)
              .where(eq(schema.orders.checkoutSessionId, checkoutSessionId))
              .limit(1);

            if (results.length === 0) {
              return null;
            }

            return await rowToOrder(results[0]!);
          },
          catch: (error) => new Error(`Failed to find order by checkout session: ${error}`),
        }),

      findByFulfillmentRef: (fulfillmentReferenceId) =>
        Effect.tryPromise({
          try: async () => {
            const results = await db
              .select()
              .from(schema.orders)
              .where(eq(schema.orders.fulfillmentReferenceId, fulfillmentReferenceId))
              .limit(1);

            if (results.length === 0) {
              return null;
            }

            return await rowToOrder(results[0]!);
          },
          catch: (error) => new Error(`Failed to find order by fulfillment ref: ${error}`),
        }),

      findAbandonedDrafts: (olderThanHours) =>
        Effect.tryPromise({
          try: async () => {
            const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

            const results = await db
              .select()
              .from(schema.orders)
              .where(eq(schema.orders.status, 'draft_created'))
              .orderBy(desc(schema.orders.createdAt));

            const abandoned = results.filter(order => order.createdAt < cutoffTime);

            return await Promise.all(abandoned.map(rowToOrder));
          },
          catch: (error) => new Error(`Failed to find abandoned drafts: ${error}`),
        }),

      updateCheckout: (orderId, checkoutSessionId, checkoutProvider) =>
        Effect.tryPromise({
          try: async () => {
            await db
              .update(schema.orders)
              .set({
                checkoutSessionId,
                checkoutProvider,
                updatedAt: new Date(),
              })
              .where(eq(schema.orders.id, orderId));

            const order = await findOrderById(orderId);
            if (!order) {
              throw new Error('Order not found');
            }
            return order;
          },
          catch: (error) => new Error(`Failed to update order checkout: ${error}`),
        }),

      updateDraftOrderIds: (orderId, draftOrderIds) =>
        Effect.tryPromise({
          try: async () => {
            await db
              .update(schema.orders)
              .set({
                draftOrderIds,
                updatedAt: new Date(),
              })
              .where(eq(schema.orders.id, orderId));

            const order = await findOrderById(orderId);
            if (!order) {
              throw new Error('Order not found');
            }
            return order;
          },
          catch: (error) => new Error(`Failed to update draft order IDs: ${error}`),
        }),

      updateStatus: (orderId, status) =>
        Effect.tryPromise({
          try: async () => {
            await db
              .update(schema.orders)
              .set({
                status,
                updatedAt: new Date(),
              })
              .where(eq(schema.orders.id, orderId));

            const order = await findOrderById(orderId);
            if (!order) {
              throw new Error('Order not found');
            }
            return order;
          },
          catch: (error) => new Error(`Failed to update order status: ${error}`),
        }),

      updateShipping: (orderId, shippingAddress) =>
        Effect.tryPromise({
          try: async () => {
            await db
              .update(schema.orders)
              .set({
                shippingAddress,
                updatedAt: new Date(),
              })
              .where(eq(schema.orders.id, orderId));

            const order = await findOrderById(orderId);
            if (!order) {
              throw new Error('Order not found');
            }
            return order;
          },
          catch: (error) => new Error(`Failed to update order shipping: ${error}`),
        }),

      updateFulfillment: (orderId, fulfillmentOrderId) =>
        Effect.tryPromise({
          try: async () => {
            await db
              .update(schema.orders)
              .set({
                fulfillmentOrderId,
                status: 'processing',
                updatedAt: new Date(),
              })
              .where(eq(schema.orders.id, orderId));

            const order = await findOrderById(orderId);
            if (!order) {
              throw new Error('Order not found');
            }
            return order;
          },
          catch: (error) => new Error(`Failed to update order fulfillment: ${error}`),
        }),

      updateTracking: (orderId, trackingInfo) =>
        Effect.tryPromise({
          try: async () => {
            await db
              .update(schema.orders)
              .set({
                trackingInfo,
                status: 'shipped',
                updatedAt: new Date(),
              })
              .where(eq(schema.orders.id, orderId));

            const order = await findOrderById(orderId);
            if (!order) {
              throw new Error('Order not found');
            }
            return order;
          },
          catch: (error) => new Error(`Failed to update order tracking: ${error}`),
        }),

      updateDeliveryEstimate: (orderId, deliveryEstimate) =>
        Effect.tryPromise({
          try: async () => {
            await db
              .update(schema.orders)
              .set({
                deliveryEstimate,
                updatedAt: new Date(),
              })
              .where(eq(schema.orders.id, orderId));

            const order = await findOrderById(orderId);
            if (!order) {
              throw new Error('Order not found');
            }
            return order;
          },
          catch: (error) => new Error(`Failed to update delivery estimate: ${error}`),
        }),
    };
  })
);

export type { OrderItem };
