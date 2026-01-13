import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getPluginClient, runMigrations, teardown, getTestDb } from '../setup';
import { createTestOrder, clearOrders } from '../helpers';
import * as schema from '@/db/schema';

describe('Printful Webhook Integration', () => {
  beforeAll(async () => {
    await runMigrations();
  });

  afterAll(async () => {
    await teardown();
  });

  beforeEach(async () => {
    await clearOrders();
  });

  const TEST_USER = 'test-user.near';

  describe('Order Status Updates', () => {
    it('should update order to shipped when package_shipped webhook received', async () => {
      const client = await getPluginClient({ nearAccountId: TEST_USER });

      const db = getTestDb();
      const orderId = 'test-order-shipped-123';
      const now = new Date();

      await db.insert(schema.orders).values({
        id: orderId,
        userId: TEST_USER,
        status: 'processing',
        totalAmount: 5000,
        currency: 'USD',
        fulfillmentReferenceId: `order_${Date.now()}_${TEST_USER}`,
        createdAt: now,
        updatedAt: now,
      });

      const printfulWebhookPayload = {
        type: 'package_shipped',
        created: Math.floor(Date.now() / 1000),
        retries: 0,
        store: 11229252,
        data: {
          shipment: {
            id: 'test-shipment-123',
            carrier: 'USPS',
            service: 'First-Class Mail',
            tracking_number: '9400111899562537866450',
            tracking_url: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899562537866450',
            created: 1697638507,
            ship_date: '2023-10-18',
            shipped_at: 1697638507,
            reshipment: false,
            items: [
              {
                item_id: 66655731,
                quantity: 1,
              },
            ],
          },
          order: {
            id: 94188292,
            external_id: orderId,
            store: 11229252,
            status: 'fulfilled',
            shipping: 'STANDARD',
            created: 1697638507,
            updated: 1697638507,
          },
        },
      };

      const webhookBody = JSON.stringify(printfulWebhookPayload);

      const result = await client.printfulWebhook({
        body: webhookBody,
      });

      expect(result.received).toBe(true);

      const updatedOrder = await client.getOrder({ id: orderId });
      expect(updatedOrder.order.status).toBe('shipped');
      expect(updatedOrder.order.trackingInfo).toBeDefined();
      expect(updatedOrder.order.trackingInfo?.length).toBeGreaterThan(0);
      
      if (updatedOrder.order.trackingInfo && updatedOrder.order.trackingInfo.length > 0) {
        const tracking = updatedOrder.order.trackingInfo[0]!;
        expect(tracking.trackingCode).toBe('9400111899562537866450');
        expect(tracking.trackingUrl).toContain('usps.com');
        expect(tracking.shipmentMethodName).toBe('First-Class Mail');
      }
    });

    it('should update order to cancelled when order_canceled webhook received', async () => {
      const client = await getPluginClient({ nearAccountId: TEST_USER });

      const db = getTestDb();
      const orderId = 'test-order-cancelled-123';
      const now = new Date();

      await db.insert(schema.orders).values({
        id: orderId,
        userId: TEST_USER,
        status: 'processing',
        totalAmount: 5000,
        currency: 'USD',
        fulfillmentReferenceId: `order_${Date.now()}_${TEST_USER}`,
        createdAt: now,
        updatedAt: now,
      });

      const printfulWebhookPayload = {
        type: 'order_canceled',
        created: Math.floor(Date.now() / 1000),
        retries: 0,
        store: 11229252,
        data: {
          order: {
            id: 94188292,
            external_id: orderId,
            store: 11229252,
            status: 'canceled',
            shipping: 'STANDARD',
            created: 1697638507,
            updated: 1697638507,
          },
          reason: 'Customer requested cancellation',
        },
      };

      const webhookBody = JSON.stringify(printfulWebhookPayload);

      const result = await client.printfulWebhook({
        body: webhookBody,
      });

      expect(result.received).toBe(true);

      const updatedOrder = await client.getOrder({ id: orderId });
      expect(updatedOrder.order.status).toBe('cancelled');
    });

    it('should log but not crash on order_put_hold webhook', async () => {
      const client = await getPluginClient({ nearAccountId: TEST_USER });

      const db = getTestDb();
      const orderId = 'test-order-hold-123';
      const now = new Date();

      await db.insert(schema.orders).values({
        id: orderId,
        userId: TEST_USER,
        status: 'processing',
        totalAmount: 5000,
        currency: 'USD',
        fulfillmentReferenceId: `order_${Date.now()}_${TEST_USER}`,
        createdAt: now,
        updatedAt: now,
      });

      const printfulWebhookPayload = {
        type: 'order_put_hold',
        created: Math.floor(Date.now() / 1000),
        retries: 0,
        store: 11229252,
        data: {
          order: {
            id: 94188292,
            external_id: orderId,
            store: 11229252,
            status: 'onhold',
            shipping: 'STANDARD',
            created: 1697638507,
            updated: 1697638507,
          },
          reason: 'Quality check required',
        },
      };

      const webhookBody = JSON.stringify(printfulWebhookPayload);

      const result = await client.printfulWebhook({
        body: webhookBody,
      });

      expect(result.received).toBe(true);

      const order = await client.getOrder({ id: orderId });
      expect(order.order.status).toBe('processing');
    });

    it('should handle order_failed webhook', async () => {
      const client = await getPluginClient({ nearAccountId: TEST_USER });

      const db = getTestDb();
      const orderId = 'test-order-failed-123';
      const now = new Date();

      await db.insert(schema.orders).values({
        id: orderId,
        userId: TEST_USER,
        status: 'processing',
        totalAmount: 5000,
        currency: 'USD',
        fulfillmentReferenceId: `order_${Date.now()}_${TEST_USER}`,
        createdAt: now,
        updatedAt: now,
      });

      const printfulWebhookPayload = {
        type: 'order_failed',
        created: Math.floor(Date.now() / 1000),
        retries: 0,
        store: 11229252,
        data: {
          order: {
            id: 94188292,
            external_id: orderId,
            store: 11229252,
            status: 'failed',
            shipping: 'STANDARD',
            created: 1697638507,
            updated: 1697638507,
          },
          reason: 'Product out of stock',
        },
      };

      const webhookBody = JSON.stringify(printfulWebhookPayload);

      const result = await client.printfulWebhook({
        body: webhookBody,
      });

      expect(result.received).toBe(true);
    });
  });

  describe('Webhook Payload Handling', () => {
    it('should handle webhook with missing external_id gracefully', async () => {
      const client = await getPluginClient();

      const printfulWebhookPayload = {
        type: 'package_shipped',
        created: Math.floor(Date.now() / 1000),
        retries: 0,
        store: 11229252,
        data: {
          shipment: {
            id: 'test-shipment-456',
            carrier: 'USPS',
            service: 'Priority Mail',
            tracking_number: '1234567890',
            tracking_url: 'https://tracking.example.com',
          },
          order: {
            id: 94188293,
            store: 11229252,
            status: 'fulfilled',
          },
        },
      };

      const webhookBody = JSON.stringify(printfulWebhookPayload);

      const result = await client.printfulWebhook({
        body: webhookBody,
      });

      expect(result.received).toBe(true);
    });

    it('should handle webhook with unknown event type', async () => {
      const client = await getPluginClient({ nearAccountId: TEST_USER });

      const db = getTestDb();
      const orderId = 'test-order-unknown-123';
      const now = new Date();

      await db.insert(schema.orders).values({
        id: orderId,
        userId: TEST_USER,
        status: 'processing',
        totalAmount: 5000,
        currency: 'USD',
        fulfillmentReferenceId: `order_${Date.now()}_${TEST_USER}`,
        createdAt: now,
        updatedAt: now,
      });

      const printfulWebhookPayload = {
        type: 'unknown_event_type',
        created: Math.floor(Date.now() / 1000),
        retries: 0,
        store: 11229252,
        data: {
          order: {
            id: 94188292,
            external_id: orderId,
            store: 11229252,
            status: 'processing',
          },
        },
      };

      const webhookBody = JSON.stringify(printfulWebhookPayload);

      const result = await client.printfulWebhook({
        body: webhookBody,
      });

      expect(result.received).toBe(true);

      const order = await client.getOrder({ id: orderId });
      expect(order.order.status).toBe('processing');
    });
  });

  describe('Tracking Information', () => {
    it('should properly parse and store multiple tracking numbers', async () => {
      const client = await getPluginClient({ nearAccountId: TEST_USER });

      const db = getTestDb();
      const orderId = 'test-order-multi-tracking-123';
      const now = new Date();

      await db.insert(schema.orders).values({
        id: orderId,
        userId: TEST_USER,
        status: 'processing',
        totalAmount: 10000,
        currency: 'USD',
        fulfillmentReferenceId: `order_${Date.now()}_${TEST_USER}`,
        createdAt: now,
        updatedAt: now,
      });

      const printfulWebhookPayload = {
        type: 'package_shipped',
        created: Math.floor(Date.now() / 1000),
        retries: 0,
        store: 11229252,
        data: {
          shipment: {
            id: 'test-shipment-789',
            carrier: 'FedEx',
            service: 'FedEx Ground',
            tracking_number: '987654321098',
            tracking_url: 'https://www.fedex.com/fedextrack/?tracknumbers=987654321098',
            created: 1697638507,
            ship_date: '2023-10-18',
          },
          order: {
            id: 94188294,
            external_id: orderId,
            store: 11229252,
            status: 'fulfilled',
          },
        },
      };

      const webhookBody = JSON.stringify(printfulWebhookPayload);

      const result = await client.printfulWebhook({
        body: webhookBody,
      });

      expect(result.received).toBe(true);

      const updatedOrder = await client.getOrder({ id: orderId });
      expect(updatedOrder.order.status).toBe('shipped');
      expect(updatedOrder.order.trackingInfo).toBeDefined();
      
      if (updatedOrder.order.trackingInfo) {
        const tracking = updatedOrder.order.trackingInfo[0]!;
        expect(tracking.trackingCode).toBe('987654321098');
        expect(tracking.trackingUrl).toContain('fedex.com');
        expect(tracking.shipmentMethodName).toBe('FedEx Ground');
      }
    });
  });
});
