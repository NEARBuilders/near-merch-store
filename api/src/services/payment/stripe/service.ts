import { Effect } from 'every-plugin/effect';
import Stripe from 'stripe';
import type { CheckoutSessionInput, CheckoutSessionOutput } from '../schema';

export class StripePaymentService {
  private stripe: Stripe;
  private webhookSecret: string;

  constructor(secretKey: string, webhookSecret: string) {
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-12-15.clover',
    });
    this.webhookSecret = webhookSecret;
  }

  createCheckout(input: CheckoutSessionInput): Effect.Effect<CheckoutSessionOutput, Error> {
    return Effect.tryPromise({
      try: async () => {
        const session = await this.stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: input.items.map(item => ({
            price_data: {
              currency: input.currency.toLowerCase(),
              product_data: {
                name: item.name,
                description: item.description,
                images: item.image ? [item.image] : undefined,
              },
              unit_amount: item.unitAmount,
            },
            quantity: item.quantity,
          })),
          mode: 'payment',
          success_url: `${input.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: input.cancelUrl,
          customer_email: input.customerEmail,
          metadata: {
            orderId: input.orderId,
            ...input.metadata,
          },
        });

        return {
          sessionId: session.id,
          url: session.url!,
        };
      },
      catch: (error: unknown) =>
        new Error(`Stripe checkout failed: ${error instanceof Error ? error.message : String(error)}`),
    });
  }

  verifyWebhook(body: string, signature: string) {
    return Effect.tryPromise({
      try: async () => {
        const event = await this.stripe.webhooks.constructEventAsync(
          body,
          signature,
          this.webhookSecret
        );
        
        let orderId: string | undefined;
        if (event.type === 'checkout.session.completed') {
          const session = event.data.object as Stripe.Checkout.Session;
          orderId = session.metadata?.orderId;
        }

        return {
          event,
          orderId,
        };
      },
      catch: (error: unknown) =>
        new Error(`Webhook verification failed: ${error instanceof Error ? error.message : String(error)}`),
    });
  }

  getSession(sessionId: string) {
    return Effect.tryPromise({
      try: async () => {
        const session = await this.stripe.checkout.sessions.retrieve(sessionId);
        return session;
      },
      catch: (error: unknown) =>
        new Error(`Failed to retrieve session: ${error instanceof Error ? error.message : String(error)}`),
    });
  }
}
