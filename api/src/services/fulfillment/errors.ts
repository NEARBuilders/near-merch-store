import { Data } from 'every-plugin/effect';

export type FulfillmentErrorCode =
  | 'RATE_LIMIT'
  | 'INVALID_ADDRESS'
  | 'SERVICE_UNAVAILABLE'
  | 'NO_RATES_AVAILABLE'
  | 'INVALID_REQUEST'
  | 'AUTHENTICATION_FAILED'
  | 'TIMEOUT'
  | 'UNKNOWN';

export class FulfillmentError extends Data.TaggedError('FulfillmentError')<{
  readonly message: string;
  readonly code: FulfillmentErrorCode;
  readonly provider: string;
  readonly statusCode?: number;
  readonly cause?: unknown;
}> {
  static fromHttpStatus(
    statusCode: number,
    provider: string,
    message: string,
    cause?: unknown
  ): FulfillmentError {
    let code: FulfillmentErrorCode = 'UNKNOWN';

    if (statusCode === 400) {
      code = 'INVALID_REQUEST';
    } else if (statusCode === 401 || statusCode === 403) {
      code = 'AUTHENTICATION_FAILED';
    } else if (statusCode === 408) {
      code = 'TIMEOUT';
    } else if (statusCode === 422) {
      code = 'INVALID_ADDRESS';
    } else if (statusCode === 429) {
      code = 'RATE_LIMIT';
    } else if (statusCode >= 500) {
      code = 'SERVICE_UNAVAILABLE';
    }

    return new FulfillmentError({ message, code, provider, statusCode, cause });
  }

  get isRetryable(): boolean {
    return this.code === 'SERVICE_UNAVAILABLE' || this.code === 'RATE_LIMIT' || this.code === 'TIMEOUT';
  }
}

/**
 * Error when fetching catalog variants from Printful
 */
export class CatalogVariantError extends Data.TaggedError('CatalogVariantError')<{
  readonly variantId: number;
  readonly cause: unknown;
}> {
  override get message(): string {
    return `Failed to fetch catalog variant ${this.variantId}`;
  }
}

/**
 * Error when fetching sync products from Printful
 */
export class SyncProductError extends Data.TaggedError('SyncProductError')<{
  readonly operation: 'list' | 'get' | 'transform' | 'enrich';
  readonly cause: unknown;
  readonly productId?: string | number;
}> {
  override get message(): string {
    const idStr = this.productId ? ` (id: ${this.productId})` : '';
    return `Sync product ${this.operation}${idStr} failed`;
  }
}

/**
 * Error when a circuit breaker is open
 */
export class CircuitBreakerOpenError extends Data.TaggedError('CircuitBreakerOpenError')<{
  readonly message: string;
  readonly lastFailureTime: number;
  readonly failureCount: number;
}> {
  get isRetryable(): boolean {
    return false;
  }
}
