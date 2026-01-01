import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { Attribute, FulfillmentConfig, ProductOption } from '../schema';

export const products = sqliteTable('products', {
  id: text('id').primaryKey(), // UUID v7
  publicKey: text('public_key').notNull().unique(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  price: integer('price').notNull(),
  currency: text('currency').notNull().default('USD'),
  category: text('category').notNull(),
  brand: text('brand'),
  productType: text('product_type'),
  options: text('options', { mode: 'json' }).$type<ProductOption[]>(),
  thumbnailImage: text('thumbnail_image'),

  fulfillmentProvider: text('fulfillment_provider').notNull(),
  externalProductId: text('external_product_id'),
  source: text('source').notNull(),
  lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }),
  listed: integer('listed', { mode: 'boolean' }).notNull().default(true),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ([
  index('category_idx').on(table.category),
  index('source_idx').on(table.source),
  index('external_product_idx').on(table.externalProductId),
  index('fulfillment_provider_idx').on(table.fulfillmentProvider),
  index('listed_idx').on(table.listed),
  index('public_key_idx').on(table.publicKey),
  index('slug_idx').on(table.slug),
  index('external_provider_idx').on(table.externalProductId, table.fulfillmentProvider), // Composite index for matching
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
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

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
