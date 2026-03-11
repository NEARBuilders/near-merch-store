import { Effect, Data } from 'every-plugin/effect';

export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export class CircuitBreakerOpenError extends Data.TaggedError('CircuitBreakerOpenError')<{
  readonly message: string;
  readonly lastFailureTime: number;
  readonly failureCount: number;
}> {
  get isRetryable() {
    return false;
  }
}

/**
 * Circuit breaker pattern implementation
 * Prevents cascade failures by stopping requests after consecutive failures
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: CircuitBreakerState = 'closed';
  private successCount = 0;

  constructor(
    private readonly name: string,
    private readonly threshold = 5,
    private readonly timeout = 60000, // 1 minute
    private readonly halfOpenMaxRequests = 3
  ) {}

  private canAttempt(): boolean {
    if (this.state === 'closed') {
      return true;
    }

    if (this.state === 'open') {
      // Check if timeout has passed
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
        this.successCount = 0;
        console.log(`[${this.name}] Circuit breaker transitioning to half-open`);
        return true;
      }
      return false;
    }

    // Half-open state
    return this.successCount < this.halfOpenMaxRequests;
  }

  private onSuccess() {
    this.failures = 0;

    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= this.halfOpenMaxRequests) {
        this.state = 'closed';
        console.log(`[${this.name}] Circuit breaker closed after ${this.successCount} successful requests`);
      }
    }
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open') {
      // Immediately trip back to open
      this.state = 'open';
      console.log(`[${this.name}] Circuit breaker tripped back to open (half-open failure)`);
    } else if (this.state === 'closed' && this.failures >= this.threshold) {
      this.state = 'open';
      console.log(`[${this.name}] Circuit breaker opened after ${this.failures} consecutive failures`);
    }
  }

  /**
   * Execute an operation with circuit breaker protection
   */
  execute<T, E extends Error>(
    operation: Effect.Effect<T, E>
  ): Effect.Effect<T, E | CircuitBreakerOpenError> {
    const self = this;
    return Effect.gen(function* () {
      if (!self.canAttempt()) {
        return yield* Effect.fail(
          new CircuitBreakerOpenError({
            message: `${self.name} circuit breaker is open`,
            lastFailureTime: self.lastFailureTime,
            failureCount: self.failures,
          })
        );
      }

      const result = yield* Effect.either(operation);

      if (result._tag === 'Left') {
        self.onFailure();
        return yield* Effect.fail(result.left);
      }

      self.onSuccess();
      return result.right;
    });
  }

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Force reset circuit breaker to closed state
   */
  reset(): void {
    this.failures = 0;
    this.lastFailureTime = 0;
    this.state = 'closed';
    this.successCount = 0;
    console.log(`[${this.name}] Circuit breaker manually reset`);
  }
}

/**
 * Pre-configured circuit breakers for different Printful APIs
 */
export const printfulCircuitBreakers = {
  v1: new CircuitBreaker('PrintfulV1', 5, 60000, 3),
  v2: new CircuitBreaker('PrintfulV2', 5, 60000, 3),
  catalog: new CircuitBreaker('PrintfulCatalog', 10, 30000, 5),
};
