import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { Attribute, FulfillmentConfig, PrintfulWebhookEventType, ProductOption } from '../schema';

export const productTypes = sqliteTable('product_types', {
  slug: text('slug').primaryKey(),
  label: text('label').notNull(),
  description: text('description'),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  publicKey: text('public_key').notNull().unique(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  price: integer('price').notNull(),
  currency: text('currency').notNull().default('USD'),
  brand: text('brand'),
  productTypeSlug: text('product_type_slug').references(() => productTypes.slug, { onDelete: 'set null' }),
  tags: text('tags', { mode: 'json' }).$type<string[]>(),
  options: text('options', { mode: 'json' }).$type<ProductOption[]>(),
  thumbnailImage: text('thumbnail_image'),
  featured: integer('featured', { mode: 'boolean' }).notNull().default(false),

  fulfillmentProvider: text('fulfillment_provider').notNull(),
  externalProductId: text('external_product_id'),
  source: text('source').notNull(),
  lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }),
  listed: integer('listed', { mode: 'boolean' }).notNull().default(true),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ([
  index('source_idx').on(table.source),
  index('external_product_idx').on(table.externalProductId),
  index('fulfillment_provider_idx').on(table.fulfillmentProvider),
  index('listed_idx').on(table.listed),
  index('public_key_idx').on(table.publicKey),
  index('slug_idx').on(table.slug),
  index('external_provider_idx').on(table.externalProductId, table.fulfillmentProvider),
  index('products_type_slug_idx').on(table.productTypeSlug),
  index('featured_idx').on(table.featured),
]));

export const productImages = sqliteTable('product_images', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  type: text('type').notNull(),
  placement: text('placement'),
  style: text('style'),
  variantIds: text('variant_ids', { mode: 'json' }).$type<string[]>(),
  order: integer('order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ([
  index('product_id_idx').on(table.productId),
  index('type_idx').on(table.type),
]));

export const productVariants = sqliteTable('product_variants', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  sku: text('sku'),
  price: integer('price').notNull(),
  currency: text('currency').notNull().default('USD'),

  attributes: text('attributes', { mode: 'json' }).$type<Attribute[]>(),
  externalVariantId: text('external_variant_id'),
  fulfillmentConfig: text('fulfillment_config', { mode: 'json' }).$type<FulfillmentConfig>(),

  inStock: integer('in_stock', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ([
  index('variant_product_idx').on(table.productId),
  index('variant_sku_idx').on(table.sku),
  index('variant_external_idx').on(table.externalVariantId),
]));

export const collections = sqliteTable('collections', {
  slug: text('slug').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  image: text('image'),
  badge: text('badge'),
  featuredProductId: text('featured_product_id').references(() => products.id, { onDelete: 'set null' }),
  carouselTitle: text('carousel_title'),
  carouselDescription: text('carousel_description'),
  showInCarousel: integer('show_in_carousel', { mode: 'boolean' }).notNull().default(true),
  carouselOrder: integer('carousel_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ([
  index('collections_carousel_idx').on(table.showInCarousel, table.carouselOrder),
]));

export const productCollections = sqliteTable('product_collections', {
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  collectionSlug: text('collection_slug').notNull().references(() => collections.slug, { onDelete: 'cascade' }),
}, (table) => ([
  primaryKey({ columns: [table.productId, table.collectionSlug] }),
  index('pc_product_idx').on(table.productId),
  index('pc_collection_idx').on(table.collectionSlug),
]));

export const syncState = sqliteTable('sync_state', {
  id: text('id').primaryKey(),
  status: text('status').notNull(),
  lastSuccessAt: integer('last_success_at', { mode: 'timestamp' }),
  lastErrorAt: integer('last_error_at', { mode: 'timestamp' }),
  errorMessage: text('error_message'),
});

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  status: text('status').notNull().default('pending'),
  totalAmount: integer('total_amount').notNull(),
  currency: text('currency').notNull().default('USD'),

  checkoutSessionId: text('checkout_session_id'),
  checkoutProvider: text('checkout_provider'),
  draftOrderIds: text('draft_order_ids', { mode: 'json' }).$type<Record<string, string>>(),
  paymentDetails: text('payment_details', { mode: 'json' }).$type<Record<string, unknown>>(),

  shippingMethod: text('shipping_method'),
  shippingAddress: text('shipping_address', { mode: 'json' }).$type<ShippingAddress>(),

  fulfillmentOrderId: text('fulfillment_order_id'),
  fulfillmentReferenceId: text('fulfillment_reference_id'),
  trackingInfo: text('tracking_info', { mode: 'json' }).$type<TrackingInfo[]>(),
  deliveryEstimate: text('delivery_estimate', { mode: 'json' }).$type<DeliveryEstimate>(),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ([
  index('orders_user_idx').on(table.userId),
  index('orders_checkout_session_idx').on(table.checkoutSessionId),
  index('orders_fulfillment_ref_idx').on(table.fulfillmentReferenceId),
  index('orders_status_idx').on(table.status),
]));

export const orderItems = sqliteTable('order_items', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull(),
  variantId: text('variant_id'),

  productName: text('product_name').notNull(),
  variantName: text('variant_name'),

  quantity: integer('quantity').notNull(),
  unitPrice: integer('unit_price').notNull(),

  attributes: text('attributes', { mode: 'json' }).$type<Attribute[]>(),
  fulfillmentProvider: text('fulfillment_provider'),
  fulfillmentConfig: text('fulfillment_config', { mode: 'json' }).$type<FulfillmentConfig>(),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ([
  index('order_items_order_idx').on(table.orderId),
  index('order_items_product_idx').on(table.productId),
  index('order_items_variant_idx').on(table.variantId),
]));

export interface ShippingAddress {
  companyName?: string;
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postCode: string;
  country: string;
  email: string;
  phone?: string;
  taxId?: string;
}

export interface TrackingInfo {
  trackingCode: string;
  trackingUrl: string;
  shipmentMethodName: string;
  shipmentMethodUid?: string;
  fulfillmentCountry?: string;
  fulfillmentStateProvince?: string;
  fulfillmentFacilityId?: string;
}

export interface DeliveryEstimate {
  minDeliveryDate: string;
  maxDeliveryDate: string;
}

export const providerConfigs = sqliteTable('provider_configs', {
  provider: text('provider').primaryKey(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
  webhookUrl: text('webhook_url'),
  webhookUrlOverride: text('webhook_url_override'),
  enabledEvents: text('enabled_events', { mode: 'json' }).$type<PrintfulWebhookEventType[]>(),
  publicKey: text('public_key'),
  secretKey: text('secret_key'),
  lastConfiguredAt: integer('last_configured_at', { mode: 'timestamp' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
