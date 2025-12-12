import { z } from 'every-plugin/zod';

export const ConnectInputSchema = z.object({
  accountId: z
    .string()
    .min(1, 'Account ID is required')
    .describe('The account ID to ensure storage deposit for'),
});

export const ConnectOutputSchema = z.object({
  accountId: z.string().describe('The account ID that was connected'),
  hasStorage: z.boolean().describe('Whether the account already had storage'),
  depositTxHash: z
    .string()
    .optional()
    .describe('Transaction hash if a deposit was made'),
});

export const PublishInputSchema = z.object({
  payload: z
    .string()
    .min(1, 'Payload is required')
    .describe('Base64 encoded signed delegate action'),
});

export const PublishOutputSchema = z.object({
  hash: z.string().describe('Transaction hash'),
});

export type ConnectInput = z.infer<typeof ConnectInputSchema>;
export type ConnectOutput = z.infer<typeof ConnectOutputSchema>;
export type PublishInput = z.infer<typeof PublishInputSchema>;
export type PublishOutput = z.infer<typeof PublishOutputSchema>;

export const ProductCategorySchema = z.enum(['Men', 'Women', 'Accessories', 'Exclusives']);

export const FulfillmentProviderSchema = z.enum(['printful', 'gelato', 'manual']);

export const FulfillmentConfigSchema = z.object({
  printfulVariantId: z.number().optional(),
  printfulSyncVariantId: z.number().optional(),
  printfulProductId: z.number().optional(),
  gelatoProductUid: z.string().optional(),
  fileUrl: z.string().nullable().optional(),
});

export const ProductImageTypeSchema = z.enum(['primary', 'mockup', 'preview', 'detail', 'catalog']);

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
]);

export const MockupConfigSchema = z.object({
  styles: z.array(MockupStyleSchema).default(['Lifestyle', 'Flat']),
  placements: z.array(MockupPlacementSchema).default(['front']),
  format: z.enum(['jpg', 'png']).default('jpg'),
  generateOnSync: z.boolean().default(true),
});

export const ProductImageSchema = z.object({
  id: z.string(),
  url: z.string(),
  type: ProductImageTypeSchema,
  placement: z.string().optional(),
  style: z.string().optional(),
  variantId: z.string().optional(),
  order: z.number().default(0),
});

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  price: z.number(),
  currency: z.string().default('USD'),
  category: ProductCategorySchema,
  images: z.array(ProductImageSchema).default([]),
  primaryImage: z.string().optional(),
  fulfillmentProvider: FulfillmentProviderSchema.default('manual'),
  fulfillmentConfig: FulfillmentConfigSchema.optional(),
  mockupConfig: MockupConfigSchema.optional(),
  sourceProductId: z.string().optional(),
  collectionIds: z.array(z.string()).optional(),
});

export const CollectionSchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string().optional(),
});

export type Product = z.infer<typeof ProductSchema>;
export type ProductCategory = z.infer<typeof ProductCategorySchema>;
export type ProductImage = z.infer<typeof ProductImageSchema>;
export type ProductImageType = z.infer<typeof ProductImageTypeSchema>;
export type MockupStyle = z.infer<typeof MockupStyleSchema>;
export type MockupPlacement = z.infer<typeof MockupPlacementSchema>;
export type MockupConfig = z.infer<typeof MockupConfigSchema>;
export type Collection = z.infer<typeof CollectionSchema>;
export type FulfillmentProvider = z.infer<typeof FulfillmentProviderSchema>;
export type FulfillmentConfig = z.infer<typeof FulfillmentConfigSchema>;

export const ShippingAddressSchema = z.object({
  companyName: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postCode: z.string().min(1),
  country: z.string().length(2),
  email: z.string().email(),
  phone: z.string().min(1).optional(),
});

export const DeliveryEstimateSchema = z.object({
  minDeliveryDate: z.string(),
  maxDeliveryDate: z.string(),
});

export const OrderStatusSchema = z.enum([
  'pending',
  'paid',
  'processing',
  'printing',
  'shipped',
  'delivered',
  'cancelled',
]);

export const TrackingInfoSchema = z.object({
  trackingCode: z.string(),
  trackingUrl: z.string(),
  shipmentMethodName: z.string(),
  shipmentMethodUid: z.string().optional(),
  fulfillmentCountry: z.string().optional(),
  fulfillmentStateProvince: z.string().optional(),
  fulfillmentFacilityId: z.string().optional(),
});

export const OrderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  productId: z.string(),
  productName: z.string(),
  quantity: z.number(),
  totalAmount: z.number(),
  currency: z.string(),
  status: OrderStatusSchema,
  checkoutSessionId: z.string().optional(),
  checkoutProvider: z.enum(['stripe', 'near']).optional(),
  fulfillmentOrderId: z.string().optional(),
  fulfillmentReferenceId: z.string().optional(),
  shippingAddress: ShippingAddressSchema.optional(),
  trackingInfo: z.array(TrackingInfoSchema).optional(),
  deliveryEstimate: DeliveryEstimateSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ShippingAddress = z.infer<typeof ShippingAddressSchema>;
export type DeliveryEstimate = z.infer<typeof DeliveryEstimateSchema>;
export type OrderStatus = z.infer<typeof OrderStatusSchema>;
export type TrackingInfo = z.infer<typeof TrackingInfoSchema>;
export type Order = z.infer<typeof OrderSchema>;

export const CreateCheckoutInputSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive().default(1),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export const CreateCheckoutOutputSchema = z.object({
  checkoutSessionId: z.string(),
  checkoutUrl: z.string().url(),
  orderId: z.string(),
});

export type CreateCheckoutInput = z.infer<typeof CreateCheckoutInputSchema>;
export type CreateCheckoutOutput = z.infer<typeof CreateCheckoutOutputSchema>;

export const WebhookResponseSchema = z.object({
  received: z.boolean(),
});

export type WebhookResponse = z.infer<typeof WebhookResponseSchema>;
