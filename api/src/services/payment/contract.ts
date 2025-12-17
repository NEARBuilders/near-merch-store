import { oc } from 'every-plugin/orpc';
import { z } from 'every-plugin/zod';
import {
  CheckoutSessionInputSchema,
  CheckoutSessionOutputSchema,
  WebhookInputSchema,
  WebhookOutputSchema,
  GetSessionInputSchema,
  GetSessionOutputSchema,
} from './schema';

export const PaymentContract = oc.router({
  ping: oc
    .route({ method: 'GET', path: '/ping' })
    .output(z.object({
      provider: z.string(),
      status: z.literal('ok'),
      timestamp: z.string().datetime(),
    })),

  createCheckout: oc
    .route({ method: 'POST', path: '/checkout' })
    .input(CheckoutSessionInputSchema)
    .output(CheckoutSessionOutputSchema),

  verifyWebhook: oc
    .route({ method: 'POST', path: '/webhook' })
    .input(WebhookInputSchema)
    .output(WebhookOutputSchema),

  getSession: oc
    .route({ method: 'GET', path: '/sessions/{sessionId}' })
    .input(GetSessionInputSchema)
    .output(GetSessionOutputSchema),
});

export type PaymentContractType = typeof PaymentContract;
