import * as crypto from 'crypto';
import { Effect } from 'every-plugin/effect';
import type { CheckoutSessionInput, CheckoutSessionOutput } from '../schema';
import { PingPayClient, type CreateCheckoutSessionInput } from './client';

export interface PingWebhookEvent {
  type: 'payment.success' | 'payment.failed' | 'checkout.session.completed';
  data: {
    sessionId?: string;
    paymentId?: string;
    amount?: string;
    recipient?: string;
    metadata?: Record<string, unknown>;
  };
}

export interface PingWebhookResult {
  event: PingWebhookEvent;
  orderId?: string;
  sessionId?: string;
}

export class PingPayService {
  private client: PingPayClient;
  private recipientAddress: string;
  private webhookSecret?: string;

  constructor(
    baseUrl = 'https://pay.pingpay.io',
    recipientAddress = 'near-merch-store.near',
    webhookSecret?: string,
    apiKey?: string
  ) {
    this.client = new PingPayClient(baseUrl, apiKey);
    this.recipientAddress = recipientAddress;
    this.webhookSecret = webhookSecret;
  }

  private verifySignature(payload: string, timestamp: string, signature: string): boolean {
    if (!this.webhookSecret) {
      console.warn('[PingPay] No webhook secret configured, skipping signature verification');
      return true;
    }

    try {
      const expected = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(`${timestamp}.${payload}`)
        .digest('hex');
      
      if (signature.length !== expected.length) {
        console.error('[PingPay] Signature length mismatch');
        return false;
      }

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expected, 'hex')
      );
    } catch (error) {
      console.error('[PingPay] Signature verification error:', error);
      return false;
    }
  }

  createCheckout(input: CheckoutSessionInput): Effect.Effect<CheckoutSessionOutput, Error> {
    return Effect.tryPromise({
      try: async () => {
        const amountInCents = Math.round(input.amount);
        const amountInUSDC = amountInCents * 10000;

        const pingInput: CreateCheckoutSessionInput = {
          amount: String(amountInUSDC),
          recipient: {
            address: this.recipientAddress,
          },
          asset: {
            chain: 'NEAR',
            symbol: 'USDC',
          },
          successUrl: input.successUrl,
          cancelUrl: input.cancelUrl,
          metadata: {
            orderId: input.orderId,
            ...input.metadata,
          },
        };

        const response = await this.client.createCheckoutSession(pingInput);

        const successUrlWithSession = input.successUrl.includes('?')
          ? `${input.successUrl}&session_id=${response.session.sessionId}`
          : `${input.successUrl}?session_id=${response.session.sessionId}`;

        return {
          sessionId: response.session.sessionId,
          url: response.sessionUrl,
        };
      },
      catch: (error: unknown) =>
        new Error(`Ping checkout failed: ${error instanceof Error ? error.message : String(error)}`),
    });
  }

  verifyWebhook(body: string, signature: string, timestamp: string): Effect.Effect<PingWebhookResult, Error> {
    return Effect.tryPromise({
      try: async () => {
        if (!this.verifySignature(body, timestamp, signature)) {
          throw new Error('Invalid webhook signature');
        }

        const payload = JSON.parse(body) as PingWebhookEvent & { 
          metadata?: Record<string, unknown>;
          sessionId?: string;
        };

        const eventType = payload.type;
        const sessionId = payload.sessionId || payload.data?.sessionId;
        const metadata = payload.metadata || payload.data?.metadata;
        const orderId = metadata?.orderId as string | undefined;

        console.log(`[PingPay Webhook] Received event: ${eventType}, sessionId: ${sessionId}`);

        return {
          event: {
            type: eventType,
            data: payload.data || {},
          },
          orderId,
          sessionId,
        };
      },
      catch: (error: unknown) =>
        new Error(`Webhook verification failed: ${error instanceof Error ? error.message : String(error)}`),
    });
  }

  getSession(sessionId: string) {
    return Effect.tryPromise({
      try: async () => {
        const response = await this.client.getCheckoutSession(sessionId);
        const session = response.session;

        const isCompleted = session.status === 'COMPLETED';

        return {
          id: session.sessionId,
          status: session.status.toLowerCase(),
          payment_status: isCompleted ? 'paid' : 'unpaid',
          amount_total: parseInt(session.amount, 10),
          currency: session.asset.symbol,
          paymentId: session.paymentId,
          metadata: session.metadata || {},
        };
      },
      catch: (error: unknown) =>
        new Error(`Failed to retrieve session: ${error instanceof Error ? error.message : String(error)}`),
    });
  }
}
