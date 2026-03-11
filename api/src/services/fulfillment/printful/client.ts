import {
  PrintfulClient as PrintfulSDK,
  CatalogItem,
  type Address,
  type Order,
  type Shipment,
  type Variant
} from 'printful-sdk-js-v2';
import {
  type PrintfulSyncProduct,
  type PrintfulSyncVariant
} from './types';
import { Effect, Schedule } from 'every-plugin/effect';
import { FulfillmentError, CatalogVariantError, SyncProductError } from '../errors';
import {
  printfulRateLimiter,
  type RateLimiter,
  parseRateLimitHeaders,
  parseRetryAfterFromError,
  parseRetryAfterFromHeaders,
  createRetrySchedule
} from '../rate-limiter';
import { getStrategy, parseTimeout, type OperationStrategy } from './strategies';
import { printfulCircuitBreakers } from './circuit-breaker';

interface PrintfulResponse<T> {
  code: number;
  result: T;
  paging?: {
    total: number;
    offset: number;
    limit: number;
  };
}

interface PrintfulSyncProductsResult {
  sync_products: PrintfulSyncProduct[];
  paging: {
    total: number;
    offset: number;
    limit: number;
  };
}

export type { Address, CatalogItem, Order, Shipment, Variant } from 'printful-sdk-js-v2';

export class PrintfulClient {
  private sdk: PrintfulSDK;
  private v1BaseUrl: string;
  private rateLimiter: RateLimiter | null = null;
  private rateLimiterInitPromise: Promise<RateLimiter> | null = null;
  private catalogVariantCache = new Map<number, Variant>();

  constructor(
    private readonly apiKey: string,
    private readonly storeId: string,
    baseUrl = 'https://api.printful.com'
  ) {
    this.sdk = new PrintfulSDK({ TOKEN: apiKey });
    this.v1BaseUrl = baseUrl;
  }

  /**
   * Initialize the rate limiter. Thread-safe - multiple concurrent calls
   * will return the same promise, preventing race conditions.
   */
  async initializeRateLimiter(): Promise<RateLimiter> {
    // If already initialized, return immediately
    if (this.rateLimiter) {
      return this.rateLimiter;
    }

    // If initialization is in progress, return the existing promise
    if (this.rateLimiterInitPromise) {
      return this.rateLimiterInitPromise;
    }

    // Start new initialization
    this.rateLimiterInitPromise = Effect.runPromise(printfulRateLimiter);
    
    try {
      this.rateLimiter = await this.rateLimiterInitPromise;
      return this.rateLimiter;
    } catch (error) {
      // Reset promise on failure so next call retries
      this.rateLimiterInitPromise = null;
      throw error;
    }
  }

  /**
   * Clean up resources. Should be called when the client is no longer needed.
   */
  async shutdown(): Promise<void> {
    if (this.rateLimiter) {
      await Effect.runPromise(this.rateLimiter.shutdown);
      this.rateLimiter = null;
      this.rateLimiterInitPromise = null;
    }
  }

  get catalogV2() {
    return this.sdk.catalogV2;
  }

  get ordersV2() {
    return this.sdk.ordersV2;
  }

  get mockupGeneratorV2() {
    return this.sdk.mockupGeneratorV2;
  }

  get filesV2() {
    return this.sdk.filesV2;
  }

  getStoreId(): string {
    return this.storeId;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'X-PF-Store-Id': this.storeId,
    };
  }

  private extractHeaders(response: Response | { headers?: Headers }): Record<string, string> {
    const headers: Record<string, string> = {};
    
    if ('headers' in response && response.headers) {
      response.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });
    }
    
    return headers;
  }

  /**
   * Execute an API call with rate limiting and retry logic.
   * Thread-safe initialization ensures rate limiter is ready before use.
   */
  private async executeWithRateLimit<T>(
    operation: () => Promise<T>,
    operationName: string,
    extractHeadersFn?: (result: T) => Record<string, string>
  ): Promise<T> {
    // Initialize rate limiter if needed (thread-safe)
    const limiter = await this.initializeRateLimiter();

    const execute = Effect.gen(this, function* () {
      const result = yield* limiter.withRateLimit(
        Effect.tryPromise({
          try: async () => {
            const data = await operation();
            return { data, headers: extractHeadersFn ? extractHeadersFn(data) : {} };
          },
          catch: (error) => {
            const message = error instanceof Error ? error.message : String(error);
            
            // Check for rate limit errors (429)
            if (message.includes('429') || message.includes('Too Many Requests') || message.includes('Rate limit')) {
              // Try to extract retry-after from multiple sources
              let retryAfter = parseRetryAfterFromError(message);
              
              // If not in error message, check if error object has headers
              if (!retryAfter && error && typeof error === 'object') {
                const errorWithHeaders = error as any;
                if (errorWithHeaders.headers) {
                  retryAfter = parseRetryAfterFromHeaders(errorWithHeaders.headers);
                }
              }
              
              return FulfillmentError.fromHttpStatus(
                429,
                'printful',
                message,
                { retryAfterMs: retryAfter }
              );
            }
            
            // Other errors
            const statusCode = error instanceof Error && 'status' in error 
              ? (error as any).status 
              : 500;
            
            return FulfillmentError.fromHttpStatus(
              statusCode,
              'printful',
              message,
              error
            );
          },
        })
      );

      // Update token count from response headers
      if (result.headers && Object.keys(result.headers).length > 0) {
        yield* limiter.updateFromHeaders(result.headers);
      }

      return result.data;
    }).pipe(
      Effect.timeout('30000 millis'), // 30 second global timeout for API calls
      Effect.retry({
        times: 5,
        schedule: createRetrySchedule(1000),
        while: (error) => {
          // Retry on rate limit with explicit wait time
          if (error instanceof FulfillmentError && error.code === 'RATE_LIMIT') {
            const retryAfter = (error.cause as any)?.retryAfterMs;
            // Only retry if we have a specific wait time
            if (retryAfter && retryAfter > 0) {
              return true;
            }
          }
          // Retry on other retryable errors
          return error instanceof FulfillmentError && error.isRetryable;
        },
      }),
      Effect.catchAll((error) => {
        if (error instanceof FulfillmentError) {
          return Effect.fail(error);
        }
        return Effect.fail(new Error(`${operationName} failed: ${error}`));
      })
    );

    return await Effect.runPromise(execute);
  }

  private async requestV1<T>(url: string, options?: RequestInit, timeoutMs = 10000): Promise<T> {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: { ...this.getHeaders(), ...options?.headers },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const headers = this.extractHeaders(response);

      if (!response.ok) {
        const errorBody = await response.text();
        
        if (response.status === 429) {
          // Extract retry-after from headers first, then error body
          let retryAfter = parseRetryAfterFromHeaders(headers);
          if (!retryAfter) {
            retryAfter = parseRetryAfterFromError(errorBody);
          }
          
          throw FulfillmentError.fromHttpStatus(
            429,
            'printful',
            `Rate limit exceeded: ${errorBody}`,
            { retryAfterMs: retryAfter, headers }
          );
        }
        
        throw FulfillmentError.fromHttpStatus(
          response.status,
          'printful',
          `Printful API error: ${response.status} - ${errorBody}`,
          { headers }
        );
      }

      const data = await response.json() as T;
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Handle timeout specifically
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeoutMs}ms`);
      }
      
      throw error;
    }
  }

  private async requestV1WithRateLimit<T>(url: string, options?: RequestInit, timeoutMs = 10000): Promise<T> {
    return this.executeWithRateLimit(
      () => this.requestV1<T>(url, options, timeoutMs),
      'V1 API request'
    );
  }

  async getSyncProducts(limit = 20, offset = 0): Promise<PrintfulSyncProductsResult> {
    const timeout = 10000; // 10 second timeout for V1 API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(
        `${this.v1BaseUrl}/store/products?limit=${limit}&offset=${offset}`,
        {
          headers: this.getHeaders(),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Printful V1 API error: ${response.status}`);
      }

      const data = await response.json() as PrintfulResponse<PrintfulSyncProduct[]> & { result: PrintfulSyncProductsResult };
      return {
        sync_products: data.result.sync_products || data.result as unknown as PrintfulSyncProduct[],
        paging: data.paging || { total: (data.result as any).length || 0, offset, limit },
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Sync products request timed out after ${timeout}ms`);
      }
      throw error;
    }
  }

  async getSyncProduct(id: number | string): Promise<{
    sync_product: PrintfulSyncProduct;
    sync_variants: PrintfulSyncVariant[];
  }> {
    const timeout = 10000; // 10 second timeout for V1 API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(
        `${this.v1BaseUrl}/store/products/${id}`,
        {
          headers: this.getHeaders(),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Printful V1 API error: ${response.status}`);
      }

      const data = await response.json() as PrintfulResponse<{
        sync_product: PrintfulSyncProduct;
        sync_variants: PrintfulSyncVariant[];
      }>;
      return data.result;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Sync product request timed out after ${timeout}ms`);
      }
      throw error;
    }
  }

  async getCatalogVariant(variantId: number): Promise<Variant | null> {
    try {
      const result = await this.executeWithRateLimit(
        () => this.sdk.catalogV2.getVariantById(variantId),
        `getCatalogVariant(${variantId})`
      );
      return (result?.data ?? null) as Variant | null;
    } catch (e) {
      if (e instanceof FulfillmentError && e.code === 'RATE_LIMIT') {
        throw e;
      }
      // Best-effort: log at debug level without stack trace
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.log(`[PrintfulClient] Catalog variant ${variantId} not available: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Get catalog variant using V2 API with strategy-based configuration
   * This is the preferred method for fetching catalog variants
   * @param variantId The catalog variant ID
   * @param strategy Operation strategy ('standard' or 'bestEffort')
   * @returns Variant data or null if not found/error
   */
  async getCatalogVariantV2(
    variantId: number, 
    strategy: OperationStrategy = 'standard'
  ): Promise<Variant | null> {
    // Check cache first
    if (this.catalogVariantCache.has(variantId)) {
      return this.catalogVariantCache.get(variantId)!;
    }

    const config = getStrategy(strategy);
    const timeout = parseTimeout(config.timeout);
    
    const effect = Effect.tryPromise({
      try: async () => {
        const response = await this.sdk.catalogV2.getVariantById(variantId);
        return (response?.data ?? null) as Variant | null;
      },
      catch: (e) => new CatalogVariantError({ variantId, cause: e }),
    }).pipe(
      Effect.timeout(timeout),
      Effect.catchAll(() => Effect.succeed(null))
    );

    // Add retry only for standard strategy
    const finalEffect = strategy === 'standard' 
      ? effect.pipe(Effect.retry({ times: config.retries, schedule: Schedule.exponential('500 millis') }))
      : effect;

    // Run with circuit breaker
    return Effect.runPromise(
      printfulCircuitBreakers.catalog.execute(finalEffect)
    ).then(variant => {
      if (variant) {
        this.catalogVariantCache.set(variantId, variant);
      }
      return variant;
    }).catch(() => null);
  }

  /**
   * Batch fetch catalog variants using V2 API with concurrency control
   * Optimized for bulk operations during sync
   * @param variantIds Array of catalog variant IDs
   * @param concurrency Maximum concurrent requests
   * @returns Map of variant ID to variant data
   */
  async getCatalogVariantsV2(
    variantIds: number[],
    concurrency = 6
  ): Promise<Map<number, Variant>> {
    const results = new Map<number, Variant>();
    
    // Remove duplicates and cached variants
    const uniqueIds = [...new Set(variantIds)].filter(id => {
      if (this.catalogVariantCache.has(id)) {
        results.set(id, this.catalogVariantCache.get(id)!);
        return false;
      }
      return true;
    });

    if (uniqueIds.length === 0) {
      return results;
    }

    // Fetch variants in parallel with bounded concurrency
    const variantResults = await Effect.runPromise(
      Effect.all(
        uniqueIds.map(id => 
          Effect.tryPromise({
            try: async () => {
              const response = await this.sdk.catalogV2.getVariantById(id);
              return { id, variant: (response?.data ?? null) as Variant | null };
            },
            catch: () => ({ id, variant: null }),
          }).pipe(
            Effect.timeout('3000 millis'), // Short timeout per variant
            Effect.catchAll(() => Effect.succeed({ id, variant: null as Variant | null }))
          )
        ),
        { concurrency }
      )
    );

    // Store results and update cache
    for (const { id, variant } of variantResults) {
      if (variant) {
        results.set(id, variant);
        this.catalogVariantCache.set(id, variant);
      }
    }

    return results;
  }

  async createOrder(orderInput: {
    external_id?: string;
    shipping?: string;
    recipient: Address;
    order_items: CatalogItem[];
  }): Promise<Order> {
    try {
      const result = await this.executeWithRateLimit(
        () => this.sdk.ordersV2.createOrder(this.storeId, orderInput),
        'createOrder'
      );
      return result.data as Order;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`[PrintfulClient] createOrder failed: ${errorMessage}`);
      throw e;
    }
  }

  async createOrderV1(orderInput: {
    external_id?: string;
    shipping?: string;
    recipient: Address;
    items: Array<{
      sync_variant_id: number;
      quantity: number;
      retail_price?: string;
      name?: string;
      external_id?: string;
    }>;
    retail_costs?: {
      currency?: string;
      subtotal?: string;
      discount?: string;
      shipping?: string;
      tax?: string;
    };
  }): Promise<Order> {
    try {
      const result = await this.requestV1WithRateLimit<PrintfulResponse<Order>>(
        `${this.v1BaseUrl}/orders`,
        {
          method: 'POST',
          body: JSON.stringify(orderInput),
        }
      );
      return result.result;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`[PrintfulClient] createOrderV1 failed: ${errorMessage}`);
      throw e;
    }
  }

  async confirmOrder(orderId: number): Promise<void> {
    await this.requestV1WithRateLimit<PrintfulResponse<{ result: string }>>(
      `${this.v1BaseUrl}/orders/${orderId}/confirm`,
      { method: 'POST' }
    );
  }

  async cancelOrder(orderId: number): Promise<void> {
    await this.requestV1WithRateLimit<PrintfulResponse<{ result: string }>>(
      `${this.v1BaseUrl}/orders/${orderId}/cancel`,
      { method: 'DELETE' }
    );
  }

  async getOrder(orderId: string): Promise<Order> {
    const result = await this.executeWithRateLimit(
      () => this.sdk.ordersV2.getOrder(orderId, this.storeId),
      `getOrder(${orderId})`
    );
    return result.data as Order;
  }

  async getOrderShipments(orderId: string): Promise<Shipment[]> {
    const result = await this.executeWithRateLimit(
      () => this.sdk.ordersV2.getShipments(orderId, this.storeId),
      `getOrderShipments(${orderId})`
    );
    return (result?.data ?? []) as Shipment[];
  }

  get webhookV2() {
    return this.sdk.webhookV2;
  }

  async configureWebhooks(params: {
    defaultUrl: string;
    events: Array<{ type: string }>;
    expiresAt?: string | null;
  }): Promise<{
    defaultUrl: string;
    expiresAt: string | null;
    events: Array<{ type: string; url: string | null }>;
    publicKey: string;
    secretKey: string;
  }> {
    const response = await this.executeWithRateLimit(
      () => this.sdk.webhookV2.createWebhook(
        {
          default_url: params.defaultUrl,
          expires_at: params.expiresAt || null,
          events: params.events,
        } as unknown as Record<string, unknown>,
        this.storeId
      ),
      'configureWebhooks'
    );

    const data = response as unknown as {
      data: {
        default_url: string;
        expires_at: string | null;
        events: Array<{ type: string; url: string | null }>;
        public_key: string;
        secret_key: string;
      };
    };

    return {
      defaultUrl: data.data.default_url,
      expiresAt: data.data.expires_at,
      events: data.data.events,
      publicKey: data.data.public_key,
      secretKey: data.data.secret_key,
    };
  }

  async disableWebhooks(): Promise<void> {
    await this.executeWithRateLimit(
      () => this.sdk.webhookV2.disableWebhook(this.storeId),
      'disableWebhooks'
    );
  }

  async getWebhookConfig(): Promise<{
    defaultUrl: string;
    expiresAt: string | null;
    events: Array<{ type: string; url: string | null }>;
    publicKey: string;
  } | null> {
    try {
      const response = await this.executeWithRateLimit(
        () => this.sdk.webhookV2.getWebhooks(this.storeId),
        'getWebhookConfig'
      );

      const data = response as unknown as {
        data: {
          default_url: string;
          expires_at: string | null;
          events: Array<{ type: string; url: string | null }>;
          public_key: string;
        };
      };

      if (!data?.data?.default_url) {
        return null;
      }

      return {
        defaultUrl: data.data.default_url,
        expiresAt: data.data.expires_at,
        events: data.data.events,
        publicKey: data.data.public_key,
      };
    } catch (error) {
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  get storesV2() {
    return this.sdk.storesV2;
  }

  async estimateOrder(params: {
    recipient: {
      country_code: string;
      zip: string;
      state_code?: string;
    };
    items: Array<{
      catalog_variant_id: number;
      quantity: number;
      designFiles?: Array<{ placement: string; url: string }>;
    }>;
    currency?: string;
  }): Promise<{
    subtotal: number;
    shipping: number;
    tax: number;
    vat: number;
    total: number;
    currency: string;
  }> {
    const orderItems = params.items.map(item => {
      const placements = (item.designFiles || []).map(df => ({
        placement: df.placement,
        technique: 'dtg' as const,
        layers: [{
          type: 'file' as const,
          url: df.url,
        }],
      }));
      
      return {
        source: CatalogItem.source.CATALOG,
        catalog_variant_id: item.catalog_variant_id,
        quantity: item.quantity,
        placements,
      };
    });
    
    const requestBody = {
      recipient: {
        country_code: params.recipient.country_code,
        zip: params.recipient.zip,
        state_code: params.recipient.state_code,
      },
      order_items: orderItems,
      retail_costs: params.currency ? { currency: params.currency } : undefined,
    };
    
    let result;
    try {
      result = await this.executeWithRateLimit(
        () => this.sdk.ordersV2.createOrderEstimationTask(this.storeId, requestBody),
        'createOrderEstimationTask'
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[PrintfulClient] createOrderEstimationTask error: ${errorMessage}`);
      throw error;
    }

    const task = result.data as { id: string; status: string };
    
    const startTime = Date.now();
    const timeoutMs = 30000;
    
    while (Date.now() - startTime < timeoutMs) {
      const pollResult = await this.executeWithRateLimit(
        () => this.sdk.ordersV2.getOrderEstimationTask(task.id, this.storeId),
        `getOrderEstimationTask(${task.id})`
      );
      
      const estimation = pollResult.data as {
        id: string;
        status: string;
        costs?: {
          subtotal: string;
          shipping: string;
          tax: string;
          vat: string;
          total: string;
          currency: string;
        };
        failure_reasons?: Array<{ message: string }>;
      };
      
      if (estimation.status === 'completed' && estimation.costs) {
        return {
          subtotal: parseFloat(estimation.costs.subtotal) || 0,
          shipping: parseFloat(estimation.costs.shipping) || 0,
          tax: parseFloat(estimation.costs.tax) || 0,
          vat: parseFloat(estimation.costs.vat) || 0,
          total: parseFloat(estimation.costs.total) || 0,
          currency: estimation.costs.currency || 'USD',
        };
      }
      
      if (estimation.status === 'failed') {
        throw new Error(`Order estimation failed: ${estimation.failure_reasons?.map(r => r.message).join(', ')}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    throw new Error('Order estimation timed out after 30 seconds');
  }
}
