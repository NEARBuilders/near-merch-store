import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  price: integer('price').notNull(),
  currency: text('currency').notNull().default('USD'),
  category: text('category').notNull(),
  primaryImage: text('primary_image'),
  
  fulfillmentProvider: text('fulfillment_provider').notNull(),
  fulfillmentConfig: text('fulfillment_config'),
  mockupConfig: text('mockup_config'),
  
  sourceProductId: text('source_product_id'),
  source: text('source').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ([
  index('category_idx').on(table.category),
  index('source_idx').on(table.source),
  index('source_product_idx').on(table.sourceProductId),
]));

export const productImages = sqliteTable('product_images', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  type: text('type').notNull(),
  placement: text('placement'),
  style: text('style'),
  variantId: text('variant_id'),
  order: integer('order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ([
  index('product_id_idx').on(table.productId),
  index('type_idx').on(table.type),
]));

export const collections = sqliteTable('collections', {
  slug: text('slug').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const productCollections = sqliteTable('product_collections', {
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  collectionSlug: text('collection_slug').notNull().references(() => collections.slug, { onDelete: 'cascade' }),
}, (table) => ([
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
  fulfillmentOrderId: text('fulfillment_order_id'),
  fulfillmentReferenceId: text('fulfillment_reference_id'),
  shippingAddress: text('shipping_address'),
  trackingInfo: text('tracking_info'),
  deliveryEstimate: text('delivery_estimate'),
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
  productName: text('product_name').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unit_price').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ([
  index('order_items_order_idx').on(table.orderId),
]));
