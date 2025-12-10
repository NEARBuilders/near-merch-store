import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  price: integer('price').notNull(),
  currency: text('currency').notNull().default('USD'),
  category: text('category').notNull(),
  image: text('image'),
  
  fulfillmentProvider: text('fulfillment_provider').notNull(),
  fulfillmentConfig: text('fulfillment_config'),
  
  source: text('source').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ([
  index('category_idx').on(table.category),
  index('source_idx').on(table.source),
]));

export const syncState = sqliteTable('sync_state', {
  id: text('id').primaryKey(),
  status: text('status').notNull(),
  lastSuccessAt: integer('last_success_at', { mode: 'timestamp' }),
  lastErrorAt: integer('last_error_at', { mode: 'timestamp' }),
  errorMessage: text('error_message'),
});
