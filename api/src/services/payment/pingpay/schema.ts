import { z } from 'every-plugin/zod';

export const PingWebhookPayloadSchema = z.object({
  type: z.enum(['payment.success', 'payment.failed', 'checkout.session.completed']),
  sessionId: z.string().optional(),
  metadata: z.object({
    orderId: z.string().optional(),
  }).optional(),
  data: z.object({
    sessionId: z.string().optional(),
    paymentId: z.string().optional(),
    status: z.string().optional(),
    amount: z.string().optional(),
    assetId: z.string().optional(),
    payerAddress: z.string().optional(),
    recipientAddress: z.string().optional(),
    merchantId: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
});

export type PingWebhookPayload = z.infer<typeof PingWebhookPayloadSchema>;

export const PingWebhookResultSchema = z.object({
  eventType: z.string(),
  orderId: z.string().optional(),
  sessionId: z.string().optional(),
});

export type PingWebhookResult = z.infer<typeof PingWebhookResultSchema>;
