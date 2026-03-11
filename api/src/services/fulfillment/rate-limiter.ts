import { Effect, Schedule, Ref, Deferred, Fiber } from 'every-plugin/effect';

export interface RateLimiter {
  withRateLimit: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
  updateFromHeaders: (headers: Record<string, string>) => Effect.Effect<void>;
  getTokensRemaining: Effect.Effect<number>;
  shutdown: Effect.Effect<void>;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetSeconds: number;
  policy: string;
}

export function parseRateLimitHeaders(headers: Record<string, string>): RateLimitInfo | null {
  const limit = headers['x-ratelimit-limit'] ?? headers['X-Ratelimit-Limit'];
  const remaining = headers['x-ratelimit-remaining'] ?? headers['X-Ratelimit-Remaining'];
  const reset = headers['x-ratelimit-reset'] ?? headers['X-Ratelimit-Reset'] ?? headers['retry-after'] ?? headers['Retry-After'];
  const policy = headers['x-ratelimit-policy'] ?? headers['X-Ratelimit-Policy'];

  if (!limit && !remaining && !reset) return null;

  return {
    limit: limit ? parseInt(limit, 10) : 0,
    remaining: remaining ? parseInt(remaining, 10) : 0,
    resetSeconds: reset ? parseFloat(reset) : 0.5,
    policy: policy ?? '120;w=60',
  };
}

export function parseRetryAfterFromError(errorMessage: string): number | null {
  if (!errorMessage) return null;
  
  // Try multiple patterns to be resilient to message format changes
  const patterns = [
    /in ([\d.]+) second\(s\)/i,  // "in 0.50 second(s)"
    /in ([\d.]+) seconds/i,       // "in 0.50 seconds"
    /in ([\d.]+)s/i,             // "in 0.50s"
    /retry after ([\d.]+)/i,      // "retry after 0.50"
    /wait ([\d.]+) second/i,     // "wait 0.50 second"
  ];
  
  for (const pattern of patterns) {
    const match = errorMessage.match(pattern);
    if (match && match[1]) {
      const seconds = parseFloat(match[1]);
      if (!isNaN(seconds) && seconds >= 0) {
        return Math.ceil(seconds * 1000);
      }
    }
  }
  
  return null;
}

export function parseRetryAfterFromHeaders(headers: Record<string, string>): number | null {
  const retryAfter = headers['retry-after'] ?? headers['Retry-After'];
  if (retryAfter) {
    const seconds = parseFloat(retryAfter);
    if (!isNaN(seconds) && seconds >= 0) {
      return Math.ceil(seconds * 1000);
    }
  }
  return null;
}

export const createRateLimiter = (
  burst: number,
  restorePerSecond: number,
  options: {
    headerSyncEnabled?: boolean;
    conservativeMode?: boolean;
    pendingTimeoutMs?: number;
    name?: string;
  } = {}
): Effect.Effect<RateLimiter> =>
  Effect.gen(function* () {
    const tokensRef = yield* Ref.make(burst);
    const pendingRef = yield* Ref.make<Array<Deferred.Deferred<void, Error>>>([]);
    const lastHeaderSyncRef = yield* Ref.make<number>(0);
    const restoreInterval = Math.floor(1000 / restorePerSecond);
    const { 
      headerSyncEnabled = true, 
      conservativeMode = false,
      pendingTimeoutMs = 30000, // 30 second default timeout
      name = 'RateLimiter'
    } = options;

    const tryProcessPending = Effect.gen(function* () {
      const tokens = yield* Ref.get(tokensRef);
      const pending = yield* Ref.get(pendingRef);

      if (tokens > 0 && pending.length > 0) {
        const deferred = pending[0]!;
        const rest = pending.slice(1);
        yield* Ref.set(tokensRef, tokens - 1);
        yield* Ref.set(pendingRef, rest);
        yield* Deferred.succeed(deferred, void 0);
      }
    });

    const restoreTokens = Effect.gen(function* () {
      const current = yield* Ref.get(tokensRef);
      const pending = yield* Ref.get(pendingRef);
      const available = Math.min(burst, current + 1);
      yield* Ref.set(tokensRef, available);

      if (pending.length > 0 && available > current) {
        yield* tryProcessPending;
      }
    });

    const restoreFiber = yield* Effect.fork(
      Effect.repeat(restoreTokens, Schedule.spaced(`${restoreInterval} millis`))
    );

    const updateFromHeaders = (headers: Record<string, string>): Effect.Effect<void> =>
      Effect.gen(function* () {
        if (!headerSyncEnabled) return;

        const now = Date.now();
        const lastSync = yield* Ref.get(lastHeaderSyncRef);
        
        // Debounce: only sync every 100ms to avoid excessive updates
        if (now - lastSync < 100) return;

        const info = parseRateLimitHeaders(headers);
        if (!info) return;

        yield* Ref.set(lastHeaderSyncRef, now);

        const currentTokens = yield* Ref.get(tokensRef);
        
        // Log significant token changes for debugging
        if (Math.abs(currentTokens - info.remaining) > 5) {
          console.log(`[${name}] Token sync: local=${currentTokens}, server=${info.remaining}, diff=${currentTokens - info.remaining}`);
        }
        
        // Conservative mode: never increase tokens beyond what we track locally
        // This prevents overshooting when multiple clients share rate limits
        if (conservativeMode) {
          yield* Ref.set(tokensRef, Math.min(currentTokens, info.remaining));
        } else {
          yield* Ref.set(tokensRef, info.remaining);
        }
      });

    const withRateLimit = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
      Effect.gen(function* () {
        const tokens = yield* Ref.get(tokensRef);

        if (tokens > 0) {
          yield* Ref.set(tokensRef, tokens - 1);
        } else {
          const deferred = yield* Deferred.make<void, Error>();
          yield* Ref.update(pendingRef, (arr) => [...arr, deferred]);
          
          // Wait for token with timeout to prevent indefinite blocking
          const tokenAcquired = yield* Deferred.await(deferred).pipe(
            Effect.timeout(`${pendingTimeoutMs} millis`),
            Effect.match({
              onSuccess: () => true,
              onFailure: () => false,
            })
          );
          
          if (!tokenAcquired) {
            // Timeout - remove from queue and fail
            yield* Ref.update(pendingRef, (arr) => arr.filter(d => d !== deferred));
            return yield* Effect.fail(new Error(`Rate limit timeout after ${pendingTimeoutMs}ms`));
          }
        }

        const result = yield* effect;
        return result;
      }) as Effect.Effect<A, E, R>;

    const shutdown = Effect.gen(function* () {
      yield* Fiber.interrupt(restoreFiber);
      // Clear pending queue to prevent memory leaks
      const pending = yield* Ref.get(pendingRef);
      for (const deferred of pending) {
        yield* Deferred.fail(deferred, new Error('Rate limiter shut down'));
      }
      yield* Ref.set(pendingRef, []);
    });

    return {
      withRateLimit,
      updateFromHeaders,
      getTokensRemaining: Ref.get(tokensRef),
      shutdown,
    };
  });

// Default rate limiter: 30 burst, 2/sec restore (matching Printful's 120/min)
// 30 tokens allows ~10 batches of 3 concurrent requests before needing to wait
// Conservative mode prevents overshooting when sharing rate limits across instances
export const printfulRateLimiter: Effect.Effect<RateLimiter> = createRateLimiter(30, 2, {
  headerSyncEnabled: true,
  conservativeMode: true,
  pendingTimeoutMs: 30000,
  name: 'PrintfulRateLimiter'
});

// Creates a retry schedule with exponential backoff
// Returns up to 5 attempts with exponential delays (1s, 2s, 4s, 8s, 16s)
export const createRetrySchedule = (baseDelay: number = 1000, maxAttempts: number = 5) =>
  Schedule.exponential(baseDelay).pipe(
    Schedule.intersect(Schedule.recurs(maxAttempts))
  ) as unknown as Schedule.Schedule<number>;
