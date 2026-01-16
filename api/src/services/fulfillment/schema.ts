import { z } from 'every-plugin/zod';
import { DesignFileSchema } from '../../schema';

export const FulfillmentProviderSchema = z.enum(['printful', 'gelato', 'manual']);

export const FulfillmentOrderStatusSchema = z.enum([
  'draft',
  'pending',
  'processing',
  'onhold',
  'printing',
  'shipped',
  'delivered',
  'cancelled',
  'failed'
]);

export const ProviderVariantSchema = z.object({
  id: z.union([z.string(), z.number()]),
  externalId: z.string(),
  name: z.string(),
  retailPrice: z.number(),
  currency: z.string(),
  sku: z.string().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  colorCode: z.string().optional(),
  catalogVariantId: z.number().optional(),
  catalogProductId: z.number().optional(),
  originalSourceId: z.union([z.string(), z.number()]).optional(), // Original product ID for fulfillment
  designFiles: z.array(DesignFileSchema).optional(),
  files: z.array(z.object({
    id: z.number().optional(),
    type: z.string(),
    url: z.string().nullable(),
    previewUrl: z.string().nullable().optional(),
  })).optional(),
});

export const ProviderProductSchema = z.object({
  id: z.union([z.string(), z.number()]),
  sourceId: z.number().or(z.string()),
  externalId: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  tags: z.array(z.string()).optional(),
  groupId: z.string().optional(),
  variants: z.array(ProviderVariantSchema),
});

export const FulfillmentOrderItemSchema = z.object({
  externalVariantId: z.string().optional(),
  productId: z.number().optional(),
  variantId: z.number().optional(),
  quantity: z.number().int().positive(),
  files: z.array(z.object({
    url: z.string(),
    type: z.string().default('default'),
    placement: z.string().optional(),
  })).optional(),
});

export const FulfillmentAddressSchema = z.object({
  name: z.string(),
  company: z.string().optional(),
  address1: z.string(),
  address2: z.string().optional(),
  city: z.string(),
  stateCode: z.string().optional(),
  countryCode: z.string(),
  zip: z.string(),
  phone: z.string().optional(),
  email: z.string().email(),
  taxId: z.string().optional(),
});

export const FulfillmentOrderInputSchema = z.object({
  externalId: z.string(),
  recipient: FulfillmentAddressSchema,
  items: z.array(FulfillmentOrderItemSchema),
  retailCosts: z.object({
    currency: z.string(),
    shipping: z.number().optional(),
    tax: z.number().optional(),
  }).optional(),
});

export const FulfillmentShipmentSchema = z.object({
  id: z.string(),
  carrier: z.string(),
  service: z.string(),
  trackingNumber: z.string(),
  trackingUrl: z.string(),
  status: z.string(),
});

export const FulfillmentOrderSchema = z.object({
  id: z.string(),
  externalId: z.string().optional(),
  status: FulfillmentOrderStatusSchema,
  created: z.number(),
  updated: z.number(),
  recipient: FulfillmentAddressSchema,
  shipments: z.array(FulfillmentShipmentSchema).optional(),
});

export const ShippingRateSchema = z.object({
  id: z.string(),
  name: z.string(),
  rate: z.number(),
  currency: z.string(),
  minDeliveryDays: z.number().optional(),
  maxDeliveryDays: z.number().optional(),
  minDeliveryDate: z.string().optional(),
  maxDeliveryDate: z.string().optional(),
});

export const ShippingQuoteInputSchema = z.object({
  recipient: FulfillmentAddressSchema,
  items: z.array(FulfillmentOrderItemSchema),
  currency: z.string().optional(),
});

export const ShippingQuoteOutputSchema = z.object({
  rates: z.array(ShippingRateSchema),
  currency: z.string(),
});

export type FulfillmentProvider = z.infer<typeof FulfillmentProviderSchema>;
export type FulfillmentOrderStatus = z.infer<typeof FulfillmentOrderStatusSchema>;
export type ProviderProduct = z.infer<typeof ProviderProductSchema>;
export type ProviderVariant = z.infer<typeof ProviderVariantSchema>;
export type FulfillmentOrderItem = z.infer<typeof FulfillmentOrderItemSchema>;
export type FulfillmentOrderInput = z.infer<typeof FulfillmentOrderInputSchema>;
export type FulfillmentOrder = z.infer<typeof FulfillmentOrderSchema>;
export type ShippingRate = z.infer<typeof ShippingRateSchema>;
export type ShippingQuoteInput = z.infer<typeof ShippingQuoteInputSchema>;
export type ShippingQuoteOutput = z.infer<typeof ShippingQuoteOutputSchema>;
