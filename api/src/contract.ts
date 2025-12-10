import { oc } from 'every-plugin/orpc';
import { z } from 'every-plugin/zod';
import {
  ConnectInputSchema,
  ConnectOutputSchema,
  PublishInputSchema,
  PublishOutputSchema,
  ProductSchema,
  ProductCategorySchema,
  CollectionSchema,
  OrderSchema,
  CreateCheckoutInputSchema,
  CreateCheckoutOutputSchema,
  WebhookResponseSchema,
} from './schema';

export const contract = oc.router({
  connect: oc
    .route({
      method: 'POST',
      path: '/connect',
      summary: 'Connect to contract',
      description:
        'Ensures the account has storage deposit on the contract. If not, makes a deposit on behalf of the user.',
      tags: ['Relayer'],
    })
    .input(ConnectInputSchema)
    .output(ConnectOutputSchema),

  publish: oc
    .route({
      method: 'POST',
      path: '/publish',
      summary: 'Publish a signed delegate action',
      description:
        'Submits a signed delegate action (meta-transaction) to the network. Used for gasless social posts and profile updates.',
      tags: ['Relayer'],
    })
    .input(PublishInputSchema)
    .output(PublishOutputSchema),

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
        orders: z.array(OrderSchema),
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
    .output(z.object({ order: OrderSchema })),

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

  fulfillmentWebhook: oc
    .route({
      method: 'POST',
      path: '/webhooks/fulfillment',
      summary: 'Fulfillment webhook',
      description: 'Handles fulfillment provider webhook events (Gelato).',
      tags: ['Webhooks'],
    })
    .input(
      z.object({
        body: z.string(),
        signature: z.string(),
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
