import { Effect } from 'every-plugin/effect';
import type { CheckoutSessionInput, CheckoutSessionOutput } from '../schema';
import { PingPayClient, type CreateCheckoutSessionInput } from './client';

export class PingPayService {
  private client: PingPayClient;
  private recipientAddress: string;
  private recipientChainId: string;

  constructor(
    baseUrl = 'https://pay.pingpay.io',
    recipientAddress = 'yourstore.near',
    recipientChainId = 'near:mainnet'
  ) {
    this.client = new PingPayClient(baseUrl);
    this.recipientAddress = recipientAddress;
    this.recipientChainId = recipientChainId;
  }

  createCheckout(input: CheckoutSessionInput): Effect.Effect<CheckoutSessionOutput, Error> {
    return Effect.tryPromise({
      try: async () => {
        const totalAmount = input.amount;
        const amountInSmallestUnit = Math.round(totalAmount).toString();

        const pingInput: CreateCheckoutSessionInput = {
          amount: {
            assetId: 'nep141:wrap.near',
            amount: amountInSmallestUnit,
          },
          recipient: {
            address: this.recipientAddress,
            chainId: this.recipientChainId,
          },
          theme: {
            brandColor: '#00ec97',
            logoUrl: 'https://near.org/logo.svg',
            buttonText: 'Complete Purchase',
          },
          successUrl: input.successUrl,
          cancelUrl: input.cancelUrl,
          metadata: {
            orderId: input.orderId,
            currency: input.currency,
            ...input.metadata,
          },
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

  verifyWebhook(body: string, signature: string) {
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
        return {
          id: response.session.sessionId,
          status: response.session.status.toLowerCase(),
          payment_status: response.session.status === 'COMPLETED' ? 'paid' : 'unpaid',
          amount_total: parseInt(response.session.amount.amount, 10),
          currency: 'NEAR',
          metadata: response.session.metadata || {},
        };
      },
      catch: (error: unknown) =>
        new Error(`Failed to retrieve session: ${error instanceof Error ? error.message : String(error)}`),
    });
  }
}
