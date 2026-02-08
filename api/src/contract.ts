import { NOT_FOUND, FORBIDDEN, UNAUTHORIZED, BAD_REQUEST } from 'every-plugin/errors';
import { oc, eventIterator } from 'every-plugin/orpc';
import { z } from 'every-plugin/zod';
import {
  CollectionSchema,
  ConfigureWebhookInputSchema,
  ConfigureWebhookOutputSchema,
  CreateCheckoutInputSchema,
  CreateCheckoutOutputSchema,
  OrderStatusEventSchema,
  OrderStatusSchema,
  OrderWithItemsSchema,
  ProductSchema,
  ProductTypeSchema,
  ProviderConfigSchema,
  QuoteItemInputSchema,
  QuoteOutputSchema,
  ShippingAddressSchema,
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
        productTypeSlug: z.string().optional(),
        collectionSlugs: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
        featured: z.boolean().optional(),
        limit: z.number().int().positive().max(100).default(50),
        offset: z.number().int().min(0).default(0),
        includeUnlisted: z.boolean().optional(),
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
    .output(z.object({ product: ProductSchema }))
    .errors({ NOT_FOUND }),

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
    )
    .errors({ NOT_FOUND }),

  getCarouselCollections: oc
    .route({
      method: 'GET',
      path: '/collections/carousel',
      summary: 'Get carousel collections',
      description: 'Returns collections configured to show in the carousel, with featured products.',
      tags: ['Collections'],
    })
    .output(
      z.object({
        collections: z.array(CollectionSchema),
      })
    ),

  updateCollection: oc
    .route({
      method: 'PUT',
      path: '/collections/{slug}',
      summary: 'Update collection settings',
      description: 'Updates collection details and carousel settings.',
      tags: ['Collections'],
    })
    .input(
      z.object({
        slug: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        image: z.string().optional(),
        badge: z.string().optional(),
        carouselTitle: z.string().optional(),
        carouselDescription: z.string().optional(),
        showInCarousel: z.boolean().optional(),
        carouselOrder: z.number().optional(),
      })
    )
    .output(
      z.object({
        collection: CollectionSchema.nullable(),
      })
    ),

  updateCollectionFeaturedProduct: oc
    .route({
      method: 'POST',
      path: '/collections/{slug}/featured-product',
      summary: 'Update collection featured product',
      description: 'Sets the featured product for a collection carousel slide.',
      tags: ['Collections'],
    })
    .input(
      z.object({
        slug: z.string(),
        productId: z.string().nullable(),
      })
    )
    .output(
      z.object({
        collection: CollectionSchema.nullable(),
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
    .output(CreateCheckoutOutputSchema)
    .errors({ BAD_REQUEST, UNAUTHORIZED }),

  quote: oc
    .route({
      method: 'POST',
      path: '/quote',
      summary: 'Get shipping quote for cart',
      description: 'Calculates shipping costs by provider for cart items.',
      tags: ['Checkout'],
    })
    .input(
      z.object({
        items: z.array(QuoteItemInputSchema).min(1),
        shippingAddress: ShippingAddressSchema,
      })
    )
    .output(QuoteOutputSchema)
    .errors({ BAD_REQUEST }),

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
    )
    .errors({ UNAUTHORIZED }),

  getOrder: oc
    .route({
      method: 'GET',
      path: '/orders/{id}',
      summary: 'Get order by ID',
      description: 'Returns a single order by its ID.',
      tags: ['Orders'],
    })
    .input(z.object({ id: z.string() }))
    .output(z.object({ order: OrderWithItemsSchema }))
    .errors({ NOT_FOUND, FORBIDDEN, UNAUTHORIZED }),

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

  subscribeOrderStatus: oc
    .route({
      method: 'GET',
      path: '/orders/status/subscribe/{sessionId}',
      summary: 'Subscribe to order status updates',
      description: 'SSE endpoint for real-time order status updates. Streams status changes until terminal state.',
      tags: ['Orders'],
    })
    .input(z.object({ sessionId: z.string() }))
    .output(eventIterator(OrderStatusEventSchema)),

  getAllOrders: oc
    .route({
      method: 'GET',
      path: '/admin/orders',
      summary: 'List all orders (Admin)',
      description: 'Returns a list of all orders. Requires admin authentication.',
      tags: ['Admin'],
    })
    .input(
      z.object({
        limit: z.number().int().positive().max(100).default(50),
        offset: z.number().int().min(0).default(0),
        status: OrderStatusSchema.optional(),
        search: z.string().optional(),
      })
    )
    .output(
      z.object({
        orders: z.array(OrderWithItemsSchema),
        total: z.number(),
      })
    )
    .errors({ UNAUTHORIZED }),

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
    .input(z.unknown())
    .output(WebhookResponseSchema),

  gelatoWebhook: oc
    .route({
      method: 'POST',
      path: '/webhooks/gelato',
      summary: 'Gelato webhook',
      description: 'Handles Gelato webhook events for order status updates.',
      tags: ['Webhooks'],
    })
    .input(z.unknown())
    .output(WebhookResponseSchema),

  pingWebhook: oc
    .route({
      method: 'POST',
      path: '/webhooks/ping',
      summary: 'Ping webhook',
      description: 'Handles Ping webhook events for payment processing.',
      tags: ['Webhooks'],
    })
    .input(z.unknown())
    .output(WebhookResponseSchema),

  sync: oc
    .route({
      method: 'POST',
      path: '/sync',
      summary: 'Sync products from fulfillment providers',
      description: 
        'Triggers sync from configured providers. Returns sync status including duration. ' +
        'Enforces single sync at a time (mutual exclusion). Auto-detects and cleans up stale syncs >5min.',
      tags: ['Sync'],
    })
    .output(
      z.object({
        status: z.enum(['idle', 'running', 'error', 'completed']),
        count: z.number().optional().describe('Products synced'),
        removed: z.number().optional().describe('Products removed'),
        syncStartedAt: z.string().datetime().optional().describe('ISO 8601 timestamp'),
        syncDuration: z.number().optional().describe('Duration in seconds'),
      })
    )
    .errors({
      SYNC_IN_PROGRESS: {
        status: 409,
        message: 'Sync is already in progress. Only one sync can run at a time',
        data: z.object({
          syncStartedAt: z.string().datetime().describe('When previous sync started'),
          duration: z.number().describe('How long it has been running (seconds)'),
        }),
      },
      SYNC_TIMEOUT: {
        status: 408,
        message: 'Sync operation timed out',
        data: z.object({
          syncStartedAt: z.string().datetime().describe('When synced started'),
          duration: z.number().describe('How long before timeout'),
        }),
      },
      SYNC_PROVIDER_ERROR: {
        status: 503,
        message: 'Fulfillment provider temporarily unavailable',
        data: z.object({
          provider: z.string().describe('Provider name: printful, gelato, etc.'),
          errorType: z.enum(['RATE_LIMIT', 'TIMEOUT', 'API_ERROR', 'AUTH', 'SERVICE_UNAVAILABLE']).describe('Error classification'),
          retryAfter: z.number().optional().describe('Suggested retry time (seconds)'),
          originalMessage: z.string().describe('Debug message'),
        }),
      },
      SYNC_FAILED: {
        status: 500,
        message: 'Sync operation failed',
        data: z.object({
          stage: z.enum(['SET_STATUS', 'FETCH_PRODUCTS', 'UPSERT', 'FINALIZE', 'UNKNOWN']).describe('Where failure occurred'),
          errorMessage: z.string().describe('Detailed error message'),
          provider: z.string().optional().describe('Provider if applicable'),
          syncDuration: z.number().optional().describe('Duration at failure'),
        }),
      },
    }),

  getSyncStatus: oc
    .route({
      method: 'GET',
      path: '/sync-status',
      summary: 'Get sync status',
      description:
        'Returns current sync status. Auto-detects stale syncs (>5min) and returns error state. ' +
        'Includes error context and timestamps.',
      tags: ['Sync'],
    })
    .output(
      z.object({
        status: z.enum(['idle', 'running', 'error']),
        lastSuccessAt: z.number().nullable().describe('Last successful sync (epoch ms)'),
        lastErrorAt: z.number().nullable().describe('Last error timestamp'),
        errorMessage: z.string().nullable().describe('Latest error message'),
        syncStartedAt: z.number().nullable().describe('Current sync start (epoch ms)'),
        updatedAt: z.number().describe('Last status update time'),
        errorData: z.record(z.string(), z.any()).nullable().describe('Full error context'),
      })
    ),
  updateProductListing: oc
    .route({
      method: 'POST',
      path: '/products/{id}/listing',
      summary: 'Update product listing status',
      description: 'Updates whether a product is listed (visible) in the store.',
      tags: ['Products'],
    })
    .input(
      z.object({
        id: z.string(),
        listed: z.boolean(),
      })
    )
    .output(
      z.object({
        success: z.boolean(),
        product: ProductSchema.optional(),
      })
    ),
    cleanupAbandonedDrafts: oc
      .route({
        method: 'POST',
        path: '/cron/cleanup-drafts',
        summary: 'Cleanup abandoned draft orders',
        description: 'Cancels draft orders older than 24 hours. Intended to be called by a cron job daily.',
        tags: ['Jobs'],
      })
      .input(
        z.object({
          maxAgeHours: z.number().int().positive().default(24).optional()
        })
      )
      .output(
        z.object({
          totalProcessed: z.number(),
          cancelled: z.number(),
          partiallyCancelled: z.number(),
          failed: z.number(),
          errors: z.array(z.object({
            orderId: z.string(),
            provider: z.string(),
            error: z.string(),
          })),
        })
      ),

  getNearPrice: oc
    .route({
      method: 'GET',
      path: '/near-price',
      summary: 'Get current NEAR price',
      description: 'Returns the current NEAR token price in USD from CoinGecko.',
      tags: ['Pricing'],
    })
    .output(
      z.object({
        price: z.number(),
        currency: z.literal('USD'),
        source: z.string(),
        cachedAt: z.number(),
      })
    ),

  getProviderConfig: oc
    .route({
      method: 'GET',
      path: '/admin/providers/{provider}',
      summary: 'Get provider configuration',
      description: 'Returns the configuration for a fulfillment provider including webhook settings.',
      tags: ['Admin', 'Providers'],
    })
    .input(z.object({ provider: z.literal('printful') }))
    .output(z.object({ config: ProviderConfigSchema.nullable() }))
    .errors({ UNAUTHORIZED }),

  configureWebhook: oc
    .route({
      method: 'POST',
      path: '/admin/providers/{provider}/webhook',
      summary: 'Configure provider webhook',
      description: 'Configures webhook URL and events for a fulfillment provider.',
      tags: ['Admin', 'Providers'],
    })
    .input(ConfigureWebhookInputSchema)
    .output(ConfigureWebhookOutputSchema)
    .errors({ BAD_REQUEST, UNAUTHORIZED }),

  disableWebhook: oc
    .route({
      method: 'DELETE',
      path: '/admin/providers/{provider}/webhook',
      summary: 'Disable provider webhook',
      description: 'Disables webhook notifications for a fulfillment provider.',
      tags: ['Admin', 'Providers'],
    })
    .input(z.object({ provider: z.literal('printful') }))
    .output(z.object({ success: z.boolean() }))
    .errors({ BAD_REQUEST, UNAUTHORIZED }),

  testProvider: oc
    .route({
      method: 'POST',
      path: '/admin/providers/{provider}/test',
      summary: 'Test provider connection',
      description: 'Tests the connection to a fulfillment provider.',
      tags: ['Admin', 'Providers'],
    })
    .input(z.object({ provider: z.literal('printful') }))
    .output(z.object({
      success: z.boolean(),
      message: z.string().optional(),
      timestamp: z.string().datetime(),
    }))
    .errors({ BAD_REQUEST, UNAUTHORIZED }),

  getCategories: oc
    .route({
      method: 'GET',
      path: '/categories',
      summary: 'List all categories (collections)',
      description: 'Returns a list of all product collections for categorization.',
      tags: ['Collections'],
    })
    .output(
      z.object({
        categories: z.array(CollectionSchema),
      })
    ),

  createCategory: oc
    .route({
      method: 'POST',
      path: '/categories',
      summary: 'Create a category (collection)',
      description: 'Creates a new collection for categorizing products.',
      tags: ['Collections'],
    })
    .input(
      z.object({
        name: z.string(),
        slug: z.string(),
        description: z.string().optional(),
        image: z.string().optional(),
      })
    )
    .output(
      z.object({
        category: CollectionSchema,
      })
    ),

  deleteCategory: oc
    .route({
      method: 'DELETE',
      path: '/categories/{id}',
      summary: 'Delete a category (collection)',
      description: 'Deletes a collection.',
      tags: ['Collections'],
    })
    .input(z.object({ id: z.string() }))
    .output(z.object({ success: z.boolean() })),

  updateProductCategories: oc
    .route({
      method: 'POST',
      path: '/products/{id}/categories',
      summary: 'Update product categories',
      description: 'Updates the collections a product belongs to.',
      tags: ['Products'],
    })
    .input(
      z.object({
        id: z.string(),
        categoryIds: z.array(z.string()),
      })
    )
    .output(
      z.object({
        success: z.boolean(),
        product: ProductSchema.optional(),
      })
    ),

  updateProductTags: oc
    .route({
      method: 'POST',
      path: '/products/{id}/tags',
      summary: 'Update product tags',
      description: 'Updates the tags on a product.',
      tags: ['Products'],
    })
    .input(
      z.object({
        id: z.string(),
        tags: z.array(z.string()),
      })
    )
    .output(
      z.object({
        success: z.boolean(),
        product: ProductSchema.optional(),
      })
    ),

  updateProductFeatured: oc
    .route({
      method: 'POST',
      path: '/products/{id}/featured',
      summary: 'Update product featured status',
      description: 'Updates whether a product is featured.',
      tags: ['Products'],
    })
    .input(
      z.object({
        id: z.string(),
        featured: z.boolean(),
      })
    )
    .output(
      z.object({
        success: z.boolean(),
        product: ProductSchema.optional(),
      })
    ),

  updateProductType: oc
    .route({
      method: 'POST',
      path: '/products/{id}/product-type',
      summary: 'Update product type',
      description: 'Updates the product type of a product.',
      tags: ['Products'],
    })
    .input(
      z.object({
        id: z.string(),
        productTypeSlug: z.string().nullable(),
      })
    )
    .output(
      z.object({
        success: z.boolean(),
        product: ProductSchema.optional(),
      })
    ),

  getProductTypes: oc
    .route({
      method: 'GET',
      path: '/product-types',
      summary: 'List all product types',
      description: 'Returns a list of all product types for categorization.',
      tags: ['Product Types'],
    })
    .output(
      z.object({
        productTypes: z.array(ProductTypeSchema),
      })
    ),

  createProductType: oc
    .route({
      method: 'POST',
      path: '/product-types',
      summary: 'Create a product type',
      description: 'Creates a new product type for categorizing products.',
      tags: ['Product Types'],
    })
    .input(
      z.object({
        slug: z.string(),
        label: z.string(),
        description: z.string().optional(),
        displayOrder: z.number().optional(),
      })
    )
    .output(
      z.object({
        productType: ProductTypeSchema,
      })
    ),

  updateProductTypeItem: oc
    .route({
      method: 'PUT',
      path: '/product-types/{slug}',
      summary: 'Update a product type',
      description: 'Updates an existing product type.',
      tags: ['Product Types'],
    })
    .input(
      z.object({
        slug: z.string(),
        label: z.string().optional(),
        description: z.string().optional(),
        displayOrder: z.number().optional(),
      })
    )
    .output(
      z.object({
        productType: ProductTypeSchema.nullable(),
      })
    ),

  deleteProductType: oc
    .route({
      method: 'DELETE',
      path: '/product-types/{slug}',
      summary: 'Delete a product type',
      description: 'Deletes a product type.',
      tags: ['Product Types'],
    })
    .input(z.object({ slug: z.string() }))
    .output(z.object({ success: z.boolean() })),
});
