import { Data } from 'every-plugin/effect';

export type FulfillmentErrorCode =
  | 'RATE_LIMIT'
  | 'INVALID_ADDRESS'
  | 'SERVICE_UNAVAILABLE'
  | 'NO_RATES_AVAILABLE'
  | 'INVALID_REQUEST'
  | 'AUTHENTICATION_FAILED'
  | 'UNSUPPORTED_OPERATION'
  | 'ORDER_NOT_CANCELLABLE'
  | 'STOCK_UNAVAILABLE'
  | 'NOT_FOUND'
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
    } else if (statusCode === 404) {
      code = 'NOT_FOUND';
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
