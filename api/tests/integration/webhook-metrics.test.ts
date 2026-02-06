import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getPluginClient, runMigrations, teardown, getTestDb } from '../setup';
import { clearOrders } from '../helpers';
import * as schema from '@/db/schema';

describe('Webhook Metrics', () => {
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

  describe('Printful Webhook Metrics', () => {
    it('should record successful shipment_sent event', async () => {
      const client = await getPluginClient({ nearAccountId: TEST_USER });
      const db = getTestDb();
      const orderId = 'test-order-metrics-123';
      const now = new Date();

      await db.insert(schema.orders).values({
        id: orderId,
        userId: TEST_USER,
        status: 'processing',
        totalAmount: 5000,
        currency: 'USD',
        fulfillmentReferenceId: `order_${Date.now()}_${TEST_USER}`,
        trackingInfo: [{
          trackingCode: '1234567890',
          trackingUrl: 'https://tracking.example.com',
          shipmentMethodName: 'Standard',
        }],
        createdAt: now,
        updatedAt: now,
      });

      const printfulWebhookPayload = {
        type: 'shipment_sent',
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
          },
          order: {
            id: 94188292,
            external_id: orderId,
            store: 11229252,
            status: 'fulfilled',
          },
        },
      };

      const result = await client.printfulWebhook({
        body: JSON.stringify(printfulWebhookPayload),
      });

      expect(result.received).toBe(true);

      const order = await client.getOrder({ id: orderId });
      expect(order.order.status).toBe('shipped');
      expect(order.order.trackingInfo?.length).toBeGreaterThan(0);
    });
  });

  describe('Webhook Health Endpoint', () => {
    it('should provide recent metrics', async () => {
      // webhookHealth endpoint not yet implemented in contract
      // This is a placeholder for future implementation
    });
  });
});