import { Effect } from 'every-plugin/effect';
import type { CheckoutSessionInput, CheckoutSessionOutput } from '../schema';
import { PingPayClient, type CreateCheckoutSessionInput } from './client';

export class PingPayService {
  private client: PingPayClient;
  private recipientAddress: string;

  constructor(
    baseUrl = 'https://pay.pingpay.io',
    recipientAddress = 'near-merch-store.near'
  ) {
    this.client = new PingPayClient(baseUrl);
    this.recipientAddress = recipientAddress;
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
        };

        const response = await this.client.createCheckoutSession(pingInput);

        return {
          sessionId: response.session.sessionId,
          url: response.sessionUrl,
        };
      },
      catch: (error: unknown) =>
        new Error(`Ping checkout failed: ${error instanceof Error ? error.message : String(error)}`),
    });
  }

  verifyWebhook(body: string, _signature: string) {
    return Effect.tryPromise({
      try: async () => {
        return {
          event: { type: 'checkout.session.completed', data: { object: {} } },
          orderId: undefined,
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
