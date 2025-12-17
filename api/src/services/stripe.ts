import { Effect } from 'every-plugin/effect';
import Stripe from 'stripe';
import type { ShippingAddress } from '../schema';
import { ShippingAddressSchema } from '../schema';

export class StripeService {
  private stripe: Stripe;
  private webhookSecret: string;

  constructor(secretKey: string, webhookSecret: string) {
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-12-15.clover',
    });
    this.webhookSecret = webhookSecret;
  }

  createCheckoutSession(params: {
    orderId: string;
    productName: string;
    productDescription?: string;
    productImage?: string;
    unitAmount: number;
    currency: string;
    quantity: number;
    customerEmail?: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }) {
    return Effect.tryPromise({
      try: async () => {
        const session = await this.stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          shipping_address_collection: {
            allowed_countries: [
              'US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE',
              'NO', 'FI', 'DK', 'BE', 'AT', 'CH', 'PT', 'IE', 'NZ', 'SG', 'JP',
            ],
          },
          shipping_options: [
            {
              shipping_rate_data: {
                type: 'fixed_amount',
                fixed_amount: {
                  amount: 0,
                  currency: params.currency.toLowerCase(),
                },
                display_name: 'Free Shipping',
                delivery_estimate: {
                  minimum: { unit: 'business_day', value: 5 },
                  maximum: { unit: 'business_day', value: 10 },
                },
              },
            },
          ],
          line_items: [
            {
              price_data: {
                currency: params.currency.toLowerCase(),
                product_data: {
                  name: params.productName,
                  description: params.productDescription,
                  images: params.productImage ? [params.productImage] : undefined,
                },
                unit_amount: params.unitAmount,
              },
              quantity: params.quantity,
            },
          ],
          mode: 'payment',
          success_url: `${params.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: params.cancelUrl,
          customer_email: params.customerEmail,
          metadata: {
            orderId: params.orderId,
            ...params.metadata,
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

  verifyWebhookSignature(body: string, signature: string) {
    return Effect.tryPromise({
      try: async () => {
        const event = await this.stripe.webhooks.constructEventAsync(
          body,
          signature,
          this.webhookSecret
        );
        return event;
      },
      catch: (error: unknown) =>
        new Error(`Webhook verification failed: ${error instanceof Error ? error.message : String(error)}`),
    });
  }

  getCheckoutSession(sessionId: string) {
    return Effect.tryPromise({
      try: async () => {
        const session = await this.stripe.checkout.sessions.retrieve(sessionId);
        return session;
      },
      catch: (error: unknown) =>
        new Error(`Failed to retrieve session: ${error instanceof Error ? error.message : String(error)}`),
    });
  }

  extractShippingAddress(session: Stripe.Checkout.Session): ShippingAddress | null {
    const shippingDetails = session.collected_information?.shipping_details;
    if (!shippingDetails) return null;

    const [firstName, ...lastNameParts] = shippingDetails.name?.split(' ') || ['', ''];
    
    try {
      return ShippingAddressSchema.parse({
        firstName,
        lastName: lastNameParts.join(' '),
        addressLine1: shippingDetails.address?.line1 || '',
        addressLine2: shippingDetails.address?.line2 || undefined,
        city: shippingDetails.address?.city || '',
        state: shippingDetails.address?.state || '',
        postCode: shippingDetails.address?.postal_code || '',
        country: shippingDetails.address?.country || '',
        email: 'orders@demo.everything.market',
        phone: undefined,
      });
    } catch {
      return null;
    }
  }
}
