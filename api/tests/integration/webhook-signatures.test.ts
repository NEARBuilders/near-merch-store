import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getPluginClient, runMigrations, teardown } from '../setup';
import { createTestOrder, clearOrders } from '../helpers';
import { createHmac } from 'crypto';

describe('Webhook Signature Verification', () => {
  beforeAll(async () => {
    await runMigrations();
  });

  afterAll(async () => {
    await teardown();
  });

  beforeEach(async () => {
    await clearOrders();
  });

  const TEST_WEBHOOK_SECRET = 'whsec_test_secret_key';

  const generateValidSignature = (
    timestamp: string,
    payload: string,
    secret: string
  ): string => {
    const signaturePayload = `${timestamp}.${payload}`;
    return createHmac('sha256', secret)
      .update(signaturePayload)
      .digest('hex');
  };

  const createWebhookHeaders = (signature: string, timestamp: string): Headers => {
    const headers = new Headers();
    headers.set('x-ping-signature', signature);
    headers.set('x-ping-timestamp', timestamp);
    return headers;
  };

  describe('PingPay Webhook Signatures', () => {
    it('should accept webhooks with valid signatures', async () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const webhookPayload = {
        id: 'whevt_valid123',
        type: 'payment.success',
        created: new Date().toISOString(),
        data: {
          paymentId: 'pay_test123',
          status: 'SUCCESS',
          amount: '1000000',
          assetId: 'NEAR:USDC',
          payerAddress: 'user.near',
          recipientAddress: 'near-merch-store.near',
          merchantId: 'merch_test',
        },
        metadata: {
          orderId: 'order_test123',
        },
      };

      const payloadString = JSON.stringify(webhookPayload);
      const validSignature = generateValidSignature(timestamp, payloadString, TEST_WEBHOOK_SECRET);
      const webhookHeaders = createWebhookHeaders(validSignature, timestamp);
      const client = await getPluginClient({ reqHeaders: webhookHeaders });

      const result = await client.pingWebhook(webhookPayload);

      expect(result.received).toBe(true);
    });

    it('should reject webhooks with invalid signatures', async () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const webhookPayload = {
        id: 'whevt_invalid123',
        type: 'payment.success',
        created: new Date().toISOString(),
        data: {
          paymentId: 'pay_test123',
          status: 'SUCCESS',
          amount: '1000000',
          assetId: 'NEAR:USDC',
          payerAddress: 'user.near',
          recipientAddress: 'near-merch-store.near',
          merchantId: 'merch_test',
        },
      };

      const invalidSignature = 'invalid_signature_abc123';
      const webhookHeaders = createWebhookHeaders(invalidSignature, timestamp);
      const client = await getPluginClient({ reqHeaders: webhookHeaders });

      await expect(client.pingWebhook(webhookPayload)).rejects.toThrow();
    });

    it('should reject webhooks with tampered payloads', async () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const originalPayload = {
        id: 'whevt_tampered123',
        type: 'payment.success',
        created: new Date().toISOString(),
        data: {
          paymentId: 'pay_test123',
          status: 'SUCCESS',
          amount: '1000000',
          assetId: 'NEAR:USDC',
          payerAddress: 'user.near',
          recipientAddress: 'near-merch-store.near',
          merchantId: 'merch_test',
        },
      };

      const originalPayloadString = JSON.stringify(originalPayload);
      const validSignature = generateValidSignature(timestamp, originalPayloadString, TEST_WEBHOOK_SECRET);

      const tamperedPayload = {
        ...originalPayload,
        data: {
          ...originalPayload.data,
          amount: '9999999999',
        },
      };

      const webhookHeaders = createWebhookHeaders(validSignature, timestamp);
      const client = await getPluginClient({ reqHeaders: webhookHeaders });

      await expect(client.pingWebhook(tamperedPayload)).rejects.toThrow();
    });

    it('should reject webhooks with wrong secret', async () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const webhookPayload = {
        id: 'whevt_wrongsecret123',
        type: 'payment.success',
        created: new Date().toISOString(),
        data: {
          paymentId: 'pay_test123',
          status: 'SUCCESS',
          amount: '1000000',
          assetId: 'NEAR:USDC',
          payerAddress: 'user.near',
          recipientAddress: 'near-merch-store.near',
          merchantId: 'merch_test',
        },
      };

      const payloadString = JSON.stringify(webhookPayload);
      const wrongSecretSignature = generateValidSignature(timestamp, payloadString, 'wrong_secret_key');
      const webhookHeaders = createWebhookHeaders(wrongSecretSignature, timestamp);
      const client = await getPluginClient({ reqHeaders: webhookHeaders });

      await expect(client.pingWebhook(webhookPayload)).rejects.toThrow();
    });

    it('should handle signature length mismatches gracefully', async () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const webhookPayload = {
        id: 'whevt_length123',
        type: 'payment.success',
        created: new Date().toISOString(),
        data: {
          paymentId: 'pay_test123',
          status: 'SUCCESS',
          amount: '1000000',
          assetId: 'NEAR:USDC',
          payerAddress: 'user.near',
          recipientAddress: 'near-merch-store.near',
          merchantId: 'merch_test',
        },
      };

      const shortSignature = 'abc123';
      const webhookHeaders = createWebhookHeaders(shortSignature, timestamp);
      const client = await getPluginClient({ reqHeaders: webhookHeaders });

      await expect(client.pingWebhook(webhookPayload)).rejects.toThrow();
    });
  });

  describe('Signature Algorithm Compliance', () => {
    it('should generate signatures matching HMAC-SHA256 spec', () => {
      const testSecret = 'test_secret';
      const testTimestamp = '1234567890';
      const testPayload = '{"test":"data"}';

      const signature1 = generateValidSignature(testTimestamp, testPayload, testSecret);
      const signature2 = generateValidSignature(testTimestamp, testPayload, testSecret);

      expect(signature1).toBe(signature2);
      expect(signature1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce different signatures for different timestamps', () => {
      const testSecret = 'test_secret';
      const testPayload = '{"test":"data"}';

      const sig1 = generateValidSignature('1234567890', testPayload, testSecret);
      const sig2 = generateValidSignature('1234567891', testPayload, testSecret);

      expect(sig1).not.toBe(sig2);
    });

    it('should produce different signatures for different payloads', () => {
      const testSecret = 'test_secret';
      const testTimestamp = '1234567890';

      const sig1 = generateValidSignature(testTimestamp, '{"amount":"100"}', testSecret);
      const sig2 = generateValidSignature(testTimestamp, '{"amount":"200"}', testSecret);

      expect(sig1).not.toBe(sig2);
    });
  });

  describe('Replay Attack Prevention', () => {
    it('should accept recent timestamps', async () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const webhookPayload = {
        id: 'whevt_recent123',
        type: 'payment.success',
        created: new Date().toISOString(),
        data: {
          paymentId: 'pay_test123',
          status: 'SUCCESS',
          amount: '1000000',
          assetId: 'NEAR:USDC',
          payerAddress: 'user.near',
          recipientAddress: 'near-merch-store.near',
          merchantId: 'merch_test',
        },
        metadata: {
          orderId: 'order_test123',
        },
      };

      const payloadString = JSON.stringify(webhookPayload);
      const validSignature = generateValidSignature(timestamp, payloadString, TEST_WEBHOOK_SECRET);
      const webhookHeaders = createWebhookHeaders(validSignature, timestamp);
      const client = await getPluginClient({ reqHeaders: webhookHeaders });

      const result = await client.pingWebhook(webhookPayload);

      expect(result.received).toBe(true);
    });
  });
});
