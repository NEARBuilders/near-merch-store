import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getPluginClient, runMigrations, teardown, getTestDb } from '../setup';
import { clearOrders } from '../helpers';
import * as schema from '@/db/schema';

describe('Cron Cleanup Draft Orders', () => {
  beforeAll(async () => {
    await runMigrations();
  });

  afterAll(async () => {
    await teardown();
  });

  beforeEach(async () => {
    await clearOrders();
    process.env.CRON_SECRET = 'test-cron-secret';
  });

  it('should reject requests with missing/invalid secret', async () => {
    const headers = new Headers();
    headers.set('x-cron-secret', 'wrong');
    const client = await getPluginClient({ reqHeaders: headers });

    await expect(client.cleanupAbandonedDrafts({ maxAgeHours: 24 })).rejects.toThrow();
  });

  it('should reject requests with missing secret header', async () => {
    const client = await getPluginClient({ reqHeaders: new Headers() });
    await expect(client.cleanupAbandonedDrafts({ maxAgeHours: 24 })).rejects.toThrow();
  });

  it('should cancel abandoned draft orders with no draftOrderIds', async () => {
    const db = getTestDb();
    const orderId = 'test-draft-to-cancel-1';
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    await db.insert(schema.orders).values({
      id: orderId,
      userId: 'test-user.near',
      status: 'draft_created',
      totalAmount: 5000,
      currency: 'USD',
      fulfillmentReferenceId: 'ord_test_1',
      draftOrderIds: null,
      createdAt: twoDaysAgo,
      updatedAt: twoDaysAgo,
    });

    const headers = new Headers();
    headers.set('x-cron-secret', 'test-cron-secret');
    const client = await getPluginClient({ reqHeaders: headers });

    const result = await client.cleanupAbandonedDrafts({ maxAgeHours: 24 });

    expect(result.totalProcessed).toBe(1);
    expect(result.cancelled).toBe(1);
    expect(result.failed).toBe(0);

    const authClient = await getPluginClient({ nearAccountId: 'test-user.near' });
    const updated = await authClient.getOrder({ id: orderId });
    expect(updated.order.status).toBe('cancelled');
  });
});
