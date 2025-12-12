import { z } from 'every-plugin/zod';

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

export const MockupStyleSchema = z.enum([
  'Lifestyle',
  'Lifestyle 2',
  'Lifestyle 3',
  'Flat',
  'Flat 2',
  'On Figure',
  'On Hanger',
  'Closeup',
  'Back',
  'Front',
  'Left',
  'Right',
  '3/4 Front',
  '3/4 Back',
]);

export const MockupPlacementSchema = z.enum([
  'front',
  'back',
  'left',
  'right',
  'front_large',
  'back_large',
  'label_outside',
  'sleeve_left',
  'sleeve_right',
  'embroidery_front',
  'embroidery_back',
]);

export const MockupFormatSchema = z.enum(['jpg', 'png']);

export const MockupConfigSchema = z.object({
  styles: z.array(MockupStyleSchema).default(['Lifestyle', 'Flat']),
  placements: z.array(MockupPlacementSchema).default(['front']),
  format: MockupFormatSchema.default('jpg'),
  generateOnSync: z.boolean().default(true),
});

export const ProviderVariantSchema = z.object({
  id: z.string(),
  externalId: z.string(),
  name: z.string(),
  retailPrice: z.number(),
  currency: z.string(),
  sku: z.string().optional(),
  catalogVariantId: z.number().optional(),
  catalogProductId: z.number().optional(),
  files: z.array(z.object({
    id: z.number().optional(),
    type: z.string(),
    url: z.string(),
    previewUrl: z.string().nullable().optional(),
  })).optional(),
});

export const ProviderProductSchema = z.object({
  id: z.string(),
  sourceId: z.number().or(z.string()),
  name: z.string(),
  description: z.string().optional(),
  thumbnailUrl: z.string().optional(),
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
  stateCode: z.string(),
  countryCode: z.string(),
  zip: z.string(),
  phone: z.string().optional(),
  email: z.string().email(),
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

export const MockupResultSchema = z.object({
  variantId: z.number(),
  placement: z.string(),
  style: z.string(),
  imageUrl: z.string(),
});

export const MockupTaskResultSchema = z.object({
  status: z.enum(['pending', 'completed', 'failed']),
  mockups: z.array(MockupResultSchema),
});

export const MockupStyleInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  placement: z.string().optional(),
  technique: z.string().optional(),
  viewName: z.string().optional(),
});

export type FulfillmentProvider = z.infer<typeof FulfillmentProviderSchema>;
export type FulfillmentOrderStatus = z.infer<typeof FulfillmentOrderStatusSchema>;
export type MockupStyle = z.infer<typeof MockupStyleSchema>;
export type MockupPlacement = z.infer<typeof MockupPlacementSchema>;
export type MockupConfig = z.infer<typeof MockupConfigSchema>;
export type ProviderProduct = z.infer<typeof ProviderProductSchema>;
export type ProviderVariant = z.infer<typeof ProviderVariantSchema>;
export type FulfillmentOrderInput = z.infer<typeof FulfillmentOrderInputSchema>;
export type FulfillmentOrder = z.infer<typeof FulfillmentOrderSchema>;
export type MockupResult = z.infer<typeof MockupResultSchema>;
export type MockupTaskResult = z.infer<typeof MockupTaskResultSchema>;
export type MockupStyleInfo = z.infer<typeof MockupStyleInfoSchema>;
