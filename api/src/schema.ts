import { z } from 'every-plugin/zod';

export const ProductCategorySchema = z.enum(['Men', 'Women', 'Accessories', 'Exclusives']);

export const AttributeSchema = z.object({
  name: z.string(),
  value: z.string(),
});

export const ProductOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  values: z.array(z.string()),
  position: z.number(),
});

export const DesignFileSchema = z.object({
  placement: z.string(),
  url: z.string(),
});

export const FulfillmentConfigSchema = z.object({
  externalVariantId: z.string().nullable().optional(),
  externalProductId: z.string().nullable().optional(),
  designFiles: z.array(DesignFileSchema).optional(),
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
  altText: z.string().optional(),
  placement: z.string().optional(),
  style: z.string().optional(),
  variantIds: z.array(z.string()).optional(),
  order: z.number().default(0),
});

export const ProductVariantSchema = z.object({
  id: z.string(),
  title: z.string(),
  sku: z.string().optional(),
  price: z.number(),
  compareAtPrice: z.number().optional(),
  currency: z.string().default('USD'),
  attributes: z.array(AttributeSchema),
  imageIds: z.array(z.string()).optional(),
  externalVariantId: z.string().optional(),
  fulfillmentConfig: FulfillmentConfigSchema.optional(),
  availableForSale: z.boolean().default(true),
  inventoryQuantity: z.number().optional(),
});

export const ProductSchema = z.object({
  id: z.string(),
  title: z.string(),
  handle: z.string().optional(),
  description: z.string().optional(),
  price: z.number(),
  currency: z.string().default('USD'),
  category: ProductCategorySchema,
  brand: z.string().optional(),
  productType: z.string().optional(),
  options: z.array(ProductOptionSchema).default([]),
  images: z.array(ProductImageSchema).default([]),
  variants: z.array(ProductVariantSchema).default([]),
  designFiles: z.array(DesignFileSchema).default([]),
  thumbnailImage: z.string().optional(),
  fulfillmentProvider: z.string().default('manual'),
  externalProductId: z.string().optional(),
  source: z.string().optional(),
  tags: z.array(z.string()).default([]),
  vendor: z.string().optional(),
  listed: z.boolean().default(true),
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
export type ProductOption = z.infer<typeof ProductOptionSchema>;
export type Attribute = z.infer<typeof AttributeSchema>;
export type ProductCategory = z.infer<typeof ProductCategorySchema>;
export type ProductImage = z.infer<typeof ProductImageSchema>;
export type ProductImageType = z.infer<typeof ProductImageTypeSchema>;
export type MockupConfig = z.infer<typeof MockupConfigSchema>;
export type Collection = z.infer<typeof CollectionSchema>;
export type FulfillmentConfig = z.infer<typeof FulfillmentConfigSchema>;

export const ShippingAddressSchema = z.object({
  companyName: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1).optional(),
  postCode: z.string().min(1),
  country: z.string().length(2),
  email: z.string().email(),
  phone: z.string().min(1).optional(),
  taxId: z.string().optional(),
});

export const DeliveryEstimateSchema = z.object({
  minDeliveryDate: z.string(),
  maxDeliveryDate: z.string(),
});

export const OrderStatusSchema = z.enum([
  'pending',
  'draft_created',
  'paid',
  'paid_pending_fulfillment',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'partially_cancelled',
  'refunded'
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
  attributes: z.array(AttributeSchema).optional(),
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
  checkoutProvider: z.enum(['stripe', 'near', 'pingpay']).optional(),
  draftOrderIds: z.record(z.string(), z.string()).optional(),
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
  shippingAddress: ShippingAddressSchema,
  selectedRates: z.record(z.string(), z.string()),
  shippingCost: z.number(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  paymentProvider: z.enum(['stripe', 'pingpay']).default('stripe'),
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

// Store/Service Types for Creating Entities
export const CreateOrderItemInputSchema = z.object({
  productId: z.string(),
  variantId: z.string().optional(),
  productName: z.string(),
  variantName: z.string().optional(),
  quantity: z.number(),
  unitPrice: z.number(),
  attributes: z.array(AttributeSchema).optional(),
  fulfillmentProvider: z.string().optional(),
  fulfillmentConfig: FulfillmentConfigSchema.optional(),
});

export const CreateOrderInputSchema = z.object({
  userId: z.string(),
  items: z.array(CreateOrderItemInputSchema),
  totalAmount: z.number(),
  currency: z.string(),
  shippingMethod: z.string().optional(),
});

export const ProductVariantInputSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string().optional(),
  price: z.number(),
  currency: z.string(),
  attributes: z.array(AttributeSchema),
  externalVariantId: z.string().optional(),
  fulfillmentConfig: FulfillmentConfigSchema.optional(),
  inStock: z.boolean().optional(),
});

export const ProductWithImagesSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  price: z.number(),
  currency: z.string(),
  category: ProductCategorySchema,
  brand: z.string().optional(),
  productType: z.string().optional(),
  options: z.array(ProductOptionSchema),
  images: z.array(ProductImageSchema),
  thumbnailImage: z.string().optional(),
  variants: z.array(ProductVariantInputSchema),
  designFiles: z.array(DesignFileSchema).default([]),
  fulfillmentProvider: z.string(),
  externalProductId: z.string().optional(),
  source: z.string(),
});

export const ProductCriteriaSchema = z.object({
  category: ProductCategorySchema.optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
  includeUnlisted: z.boolean().optional(),
});

export const OrderWithItemsSchema = z.object({
  id: z.string(),
  userId: z.string(),
  status: OrderStatusSchema,
  totalAmount: z.number(),
  currency: z.string(),
  checkoutSessionId: z.string().optional(),
  checkoutProvider: z.enum(['stripe', 'near', 'pingpay']).optional(),
  draftOrderIds: z.record(z.string(), z.string()).optional(),
  shippingMethod: z.string().optional(),
  shippingAddress: ShippingAddressSchema.optional(),
  fulfillmentOrderId: z.string().optional(),
  fulfillmentReferenceId: z.string().optional(),
  trackingInfo: z.array(TrackingInfoSchema).optional(),
  deliveryEstimate: DeliveryEstimateSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  items: z.array(OrderItemSchema),
});

export type CreateOrderItemInput = z.infer<typeof CreateOrderItemInputSchema>;
export type CreateOrderInput = z.infer<typeof CreateOrderInputSchema>;
export type ProductVariantInput = z.infer<typeof ProductVariantInputSchema>;
export type ProductWithImages = z.infer<typeof ProductWithImagesSchema>;
export type ProductCriteria = z.infer<typeof ProductCriteriaSchema>;
export type OrderWithItems = z.infer<typeof OrderWithItemsSchema>;

export const QuoteItemInputSchema = z.object({
  productId: z.string(),
  variantId: z.string().optional(),
  quantity: z.number().int().positive().default(1),
});

export const ProviderShippingOptionSchema = z.object({
  provider: z.string(),
  rateId: z.string(),
  rateName: z.string(),
  shippingCost: z.number(),
  currency: z.string(),
  minDeliveryDays: z.number().optional(),
  maxDeliveryDays: z.number().optional(),
});

export const ProviderBreakdownSchema = z.object({
  provider: z.string(),
  itemCount: z.number(),
  subtotal: z.number(),
  selectedShipping: ProviderShippingOptionSchema,
  availableRates: z.array(ProviderShippingOptionSchema),
});

export const QuoteOutputSchema = z.object({
  subtotal: z.number(),
  shippingCost: z.number(),
  tax: z.number(),
  total: z.number(),
  currency: z.string(),
  providerBreakdown: z.array(ProviderBreakdownSchema),
  estimatedDelivery: z.object({
    minDays: z.number().optional(),
    maxDays: z.number().optional(),
  }).optional(),
});

export type QuoteItemInput = z.infer<typeof QuoteItemInputSchema>;
export type ProviderShippingOption = z.infer<typeof ProviderShippingOptionSchema>;
export type ProviderBreakdown = z.infer<typeof ProviderBreakdownSchema>;
export type QuoteOutput = z.infer<typeof QuoteOutputSchema>;
