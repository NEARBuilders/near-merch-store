import { oc } from 'every-plugin/orpc';
import { z } from 'every-plugin/zod';
import {
  CollectionSchema,
  CreateCheckoutInputSchema,
  CreateCheckoutOutputSchema,
  OrderWithItemsSchema,
  ProductCategorySchema,
  ProductSchema,
  WebhookResponseSchema
} from './schema';

export const contract = oc.router({
  ping: oc
    .route({
      method: 'GET',
      path: '/ping',
      summary: 'Health check',
      description: 'Simple ping endpoint to verify the API is responding.',
      tags: ['Health'],
    })
    .output(
      z.object({
        status: z.literal('ok'),
        timestamp: z.string().datetime(),
      })
    ),

  getProducts: oc
    .route({
      method: 'GET',
      path: '/products',
      summary: 'List all products',
      description: 'Returns a list of all available products.',
      tags: ['Products'],
    })
    .input(
      z.object({
        category: ProductCategorySchema.optional(),
        limit: z.number().int().positive().max(100).default(50),
        offset: z.number().int().min(0).default(0),
      })
    )
    .output(
      z.object({
        products: z.array(ProductSchema),
        total: z.number(),
      })
    ),

  getProduct: oc
    .route({
      method: 'GET',
      path: '/products/{id}',
      summary: 'Get product by ID',
      description: 'Returns a single product by its ID.',
      tags: ['Products'],
    })
    .input(z.object({ id: z.string() }))
    .output(z.object({ product: ProductSchema })),

  searchProducts: oc
    .route({
      method: 'GET',
      path: '/products/search',
      summary: 'Search products',
      description: 'Search products by query string.',
      tags: ['Products'],
    })
    .input(
      z.object({
        query: z.string(),
        category: ProductCategorySchema.optional(),
        limit: z.number().int().positive().max(100).default(20),
      })
    )
    .output(
      z.object({
        products: z.array(ProductSchema),
      })
    ),

  getFeaturedProducts: oc
    .route({
      method: 'GET',
      path: '/products/featured',
      summary: 'Get featured products',
      description: 'Returns a curated list of featured products.',
      tags: ['Products'],
    })
    .input(
      z.object({
        limit: z.number().int().positive().max(20).default(8),
      })
    )
    .output(
      z.object({
        products: z.array(ProductSchema),
      })
    ),

  getCollections: oc
    .route({
      method: 'GET',
      path: '/collections',
      summary: 'List all collections',
      description: 'Returns a list of all product collections/categories.',
      tags: ['Collections'],
    })
    .output(
      z.object({
        collections: z.array(CollectionSchema),
      })
    ),

  getCollection: oc
    .route({
      method: 'GET',
      path: '/collections/{slug}',
      summary: 'Get collection by slug',
      description: 'Returns a collection with its products.',
      tags: ['Collections'],
    })
    .input(z.object({ slug: z.string() }))
    .output(
      z.object({
        collection: CollectionSchema,
        products: z.array(ProductSchema),
      })
    ),

  createCheckout: oc
    .route({
      method: 'POST',
      path: '/checkout',
      summary: 'Create checkout session',
      description: 'Creates a new checkout session for purchasing a product.',
      tags: ['Checkout'],
    })
    .input(CreateCheckoutInputSchema)
    .output(CreateCheckoutOutputSchema),

  getOrders: oc
    .route({
      method: 'GET',
      path: '/orders',
      summary: 'List user orders',
      description: 'Returns a list of orders for the authenticated user.',
      tags: ['Orders'],
    })
    .input(
      z.object({
        limit: z.number().int().positive().max(100).default(10),
        offset: z.number().int().min(0).default(0),
      })
    )
    .output(
      z.object({
        orders: z.array(OrderWithItemsSchema),
        total: z.number(),
      })
    ),

  getOrder: oc
    .route({
      method: 'GET',
      path: '/orders/{id}',
      summary: 'Get order by ID',
      description: 'Returns a single order by its ID.',
      tags: ['Orders'],
    })
    .input(z.object({ id: z.string() }))
    .output(z.object({ order: OrderWithItemsSchema })),

  getOrderByCheckoutSession: oc
    .route({
      method: 'GET',
      path: '/orders/by-session/{sessionId}',
      summary: 'Get order by checkout session ID',
      description: 'Returns an order by its Stripe checkout session ID.',
      tags: ['Orders'],
    })
    .input(z.object({ sessionId: z.string() }))
    .output(z.object({ order: OrderWithItemsSchema.nullable() })),

  stripeWebhook: oc
    .route({
      method: 'POST',
      path: '/webhooks/stripe',
      summary: 'Stripe webhook',
      description: 'Handles Stripe webhook events for payment processing.',
      tags: ['Webhooks'],
    })
    .input(
      z.object({
        body: z.string(),
        signature: z.string(),
      })
    )
    .output(WebhookResponseSchema),

  printfulWebhook: oc
    .route({
      method: 'POST',
      path: '/webhooks/printful',
      summary: 'Printful webhook',
      description: 'Handles Printful webhook events for order status updates.',
      tags: ['Webhooks'],
    })
    .input(
      z.object({
        body: z.string(),
        signature: z.string().optional(),
      })
    )
    .output(WebhookResponseSchema),

  gelatoWebhook: oc
    .route({
      method: 'POST',
      path: '/webhooks/gelato',
      summary: 'Gelato webhook',
      description: 'Handles Gelato webhook events for order status updates.',
      tags: ['Webhooks'],
    })
    .input(
      z.object({
        body: z.string(),
        signature: z.string().optional(),
      })
    )
    .output(WebhookResponseSchema),

  sync: oc
    .route({
      method: 'POST',
      path: '/sync',
      summary: 'Sync products from fulfillment providers',
      description: 'Triggers a sync of products from configured fulfillment providers (Printful). Runs in the background.',
      tags: ['Sync'],
    })
    .output(
      z.object({
        status: z.string(),
        count: z.number().optional(),
      })
    ),

  getSyncStatus: oc
    .route({
      method: 'GET',
      path: '/sync-status',
      summary: 'Get sync status',
      description: 'Returns the current status of product sync operations.',
      tags: ['Sync'],
    })
    .output(
      z.object({
        status: z.enum(['idle', 'running', 'error']),
        lastSuccessAt: z.number().nullable(),
        lastErrorAt: z.number().nullable(),
        errorMessage: z.string().nullable(),
      })
    ),
});
