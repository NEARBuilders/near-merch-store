import { Effect } from 'every-plugin/effect';
import type { Order, OrderStatus, ShippingAddress, TrackingInfo, DeliveryEstimate } from '../schema';

export class OrderService {
  private orders: Map<string, Order> = new Map();

  createOrder(params: {
    userId: string;
    productId: string;
    productName: string;
    quantity: number;
    totalAmount: number;
    currency: string;
  }) {
    return Effect.sync(() => {
      const now = new Date().toISOString();
      const order: Order = {
        id: crypto.randomUUID(),
        userId: params.userId,
        productId: params.productId,
        productName: params.productName,
        quantity: params.quantity,
        totalAmount: params.totalAmount,
        currency: params.currency,
        status: 'pending',
        fulfillmentReferenceId: `order_${Date.now()}_${params.userId}`,
        createdAt: now,
        updatedAt: now,
      };
      this.orders.set(order.id, order);
      return order;
    });
  }

  getOrder(orderId: string, userId?: string) {
    return Effect.gen(this, function* () {
      const order = this.orders.get(orderId);
      if (!order) {
        return yield* Effect.fail(new Error('Order not found'));
      }
      if (userId && order.userId !== userId) {
        return yield* Effect.fail(new Error('Unauthorized'));
      }
      return { order };
    });
  }

  getOrders(userId: string, options: { limit?: number; offset?: number }) {
    return Effect.sync(() => {
      const { limit = 10, offset = 0 } = options;
      const userOrders = Array.from(this.orders.values())
        .filter((o) => o.userId === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const total = userOrders.length;
      const orders = userOrders.slice(offset, offset + limit);
      return { orders, total };
    });
  }

  updateOrderCheckout(orderId: string, checkoutSessionId: string, checkoutProvider: 'stripe' | 'near') {
    return Effect.gen(this, function* () {
      const order = this.orders.get(orderId);
      if (!order) {
        return yield* Effect.fail(new Error('Order not found'));
      }
      order.checkoutSessionId = checkoutSessionId;
      order.checkoutProvider = checkoutProvider;
      order.updatedAt = new Date().toISOString();
      return order;
    });
  }

  updateOrderStatus(orderId: string, status: OrderStatus) {
    return Effect.gen(this, function* () {
      const order = this.orders.get(orderId);
      if (!order) {
        return yield* Effect.fail(new Error('Order not found'));
      }
      order.status = status;
      order.updatedAt = new Date().toISOString();
      return order;
    });
  }

  updateOrderShipping(orderId: string, shippingAddress: ShippingAddress) {
    return Effect.gen(this, function* () {
      const order = this.orders.get(orderId);
      if (!order) {
        return yield* Effect.fail(new Error('Order not found'));
      }
      order.shippingAddress = shippingAddress;
      order.updatedAt = new Date().toISOString();
      return order;
    });
  }

  updateOrderFulfillment(orderId: string, fulfillmentOrderId: string) {
    return Effect.gen(this, function* () {
      const order = this.orders.get(orderId);
      if (!order) {
        return yield* Effect.fail(new Error('Order not found'));
      }
      order.fulfillmentOrderId = fulfillmentOrderId;
      order.status = 'processing';
      order.updatedAt = new Date().toISOString();
      return order;
    });
  }

  updateOrderTracking(orderId: string, trackingInfo: TrackingInfo[]) {
    return Effect.gen(this, function* () {
      const order = this.orders.get(orderId);
      if (!order) {
        return yield* Effect.fail(new Error('Order not found'));
      }
      order.trackingInfo = trackingInfo;
      order.updatedAt = new Date().toISOString();
      return order;
    });
  }

  updateOrderDeliveryEstimate(orderId: string, deliveryEstimate: DeliveryEstimate) {
    return Effect.gen(this, function* () {
      const order = this.orders.get(orderId);
      if (!order) {
        return yield* Effect.fail(new Error('Order not found'));
      }
      order.deliveryEstimate = deliveryEstimate;
      order.updatedAt = new Date().toISOString();
      return order;
    });
  }

  getOrderByFulfillmentReference(fulfillmentReferenceId: string) {
    return Effect.sync(() => {
      for (const order of this.orders.values()) {
        if (order.fulfillmentReferenceId === fulfillmentReferenceId) {
          return order;
        }
      }
      return undefined;
    });
  }

  getOrderByCheckoutSession(checkoutSessionId: string) {
    return Effect.sync(() => {
      for (const order of this.orders.values()) {
        if (order.checkoutSessionId === checkoutSessionId) {
          return order;
        }
      }
      return undefined;
    });
  }
}
