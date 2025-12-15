import { z } from 'every-plugin/zod';

export const ProductCategorySchema = z.enum(['Men', 'Women', 'Accessories', 'Exclusives']);

export const VariantAttributesSchema = z.object({
  size: z.string().optional(),
  color: z.string().optional(),
  colorCode: z.string().optional(),
}).catchall(z.union([z.string(), z.number(), z.boolean()]));

export const FulfillmentConfigSchema = z.object({
  externalVariantId: z.string().nullable().optional(),
  externalProductId: z.string().nullable().optional(),
  designFileUrl: z.string().nullable().optional(),
  providerData: z.record(z.string(), z.unknown()).optional(),
});

export const ProductImageTypeSchema = z.enum(['primary', 'mockup', 'preview', 'detail', 'catalog']);

export const MockupConfigSchema = z.object({
  styles: z.array(z.string()).optional(),
  placements: z.array(z.string()).optional(),
  format: z.enum(['jpg', 'png']).optional(),
  generateOnSync: z.boolean().optional(),
});

export const ProductImageSchema = z.object({
  id: z.string(),
  url: z.string(),
  type: ProductImageTypeSchema,
  placement: z.string().optional(),
  style: z.string().optional(),
  variantIds: z.array(z.string()).optional(),
  order: z.number().default(0),
});

export const ProductVariantSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string().optional(),
  price: z.number(),
  currency: z.string().default('USD'),
  attributes: VariantAttributesSchema.optional(),
  externalVariantId: z.string().optional(),
  fulfillmentConfig: FulfillmentConfigSchema.optional(),
  inStock: z.boolean().default(true),
});

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  price: z.number(),
  currency: z.string().default('USD'),
  category: ProductCategorySchema,
  brand: z.string().optional(),
  productType: z.string().optional(),
  images: z.array(ProductImageSchema).default([]),
  primaryImage: z.string().optional(),
  variants: z.array(ProductVariantSchema).default([]),
  fulfillmentProvider: z.string().default('manual'),
  externalProductId: z.string().optional(),
  source: z.string().optional(),
  mockupConfig: MockupConfigSchema.optional(),
  collectionIds: z.array(z.string()).optional(),
});

export const CollectionSchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string().optional(),
  image: z.string().optional(),
  badge: z.string().optional(),
  features: z.array(z.string()).optional(),
});

export type Product = z.infer<typeof ProductSchema>;
export type ProductVariant = z.infer<typeof ProductVariantSchema>;
export type ProductCategory = z.infer<typeof ProductCategorySchema>;
export type ProductImage = z.infer<typeof ProductImageSchema>;
export type ProductImageType = z.infer<typeof ProductImageTypeSchema>;
export type MockupConfig = z.infer<typeof MockupConfigSchema>;
export type Collection = z.infer<typeof CollectionSchema>;
export type FulfillmentConfig = z.infer<typeof FulfillmentConfigSchema>;
export type VariantAttributes = z.infer<typeof VariantAttributesSchema>;

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

export const OrderItemSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  productId: z.string(),
  variantId: z.string().optional(),
  productName: z.string(),
  variantName: z.string().optional(),
  quantity: z.number(),
  unitPrice: z.number(),
  attributes: VariantAttributesSchema.optional(),
  fulfillmentProvider: z.string().optional(),
  fulfillmentConfig: FulfillmentConfigSchema.optional(),
});

export const OrderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  status: OrderStatusSchema,
  totalAmount: z.number(),
  currency: z.string(),
  checkoutSessionId: z.string().optional(),
  checkoutProvider: z.enum(['stripe', 'near']).optional(),
  shippingMethod: z.string().optional(),
  shippingAddress: ShippingAddressSchema.optional(),
  fulfillmentOrderId: z.string().optional(),
  fulfillmentReferenceId: z.string().optional(),
  trackingInfo: z.array(TrackingInfoSchema).optional(),
  deliveryEstimate: DeliveryEstimateSchema.optional(),
  items: z.array(OrderItemSchema).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ShippingAddress = z.infer<typeof ShippingAddressSchema>;
export type DeliveryEstimate = z.infer<typeof DeliveryEstimateSchema>;
export type OrderStatus = z.infer<typeof OrderStatusSchema>;
export type TrackingInfo = z.infer<typeof TrackingInfoSchema>;
export type OrderItem = z.infer<typeof OrderItemSchema>;
export type Order = z.infer<typeof OrderSchema>;

export const CreateCheckoutInputSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    variantId: z.string().optional(),
    quantity: z.number().int().positive().default(1),
  })),
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

export const ReturnAddressSchema = ShippingAddressSchema;

export type ReturnAddress = z.infer<typeof ReturnAddressSchema>;
