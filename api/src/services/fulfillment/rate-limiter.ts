import { Effect, Schedule, Ref, Deferred, Fiber } from 'every-plugin/effect';

export interface RateLimiter {
  withRateLimit: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
  shutdown: Effect.Effect<void>;
}

export const createRateLimiter = (
  burst: number,
  restorePerSecond: number
): Effect.Effect<RateLimiter> =>
  Effect.gen(function* () {
    const tokensRef = yield* Ref.make(burst);
    const pendingRef = yield* Ref.make<Array<Deferred.Deferred<void>>>([]);
    const restoreInterval = Math.floor(1000 / restorePerSecond);

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

    return {
      withRateLimit: <A, E, R>(effect: Effect.Effect<A, E, R>) =>
        Effect.gen(function* () {
          const tokens = yield* Ref.get(tokensRef);
          
          if (tokens > 0) {
            yield* Ref.set(tokensRef, tokens - 1);
          } else {
            const deferred = yield* Deferred.make<void>();
            yield* Ref.update(pendingRef, (arr) => [...arr, deferred]);
            yield* Deferred.await(deferred);
          }
          
          const result = yield* effect;
          return result;
        }),

      shutdown: Fiber.interrupt(restoreFiber),
    };
  });

export const printfulRateLimiter: Effect.Effect<RateLimiter> = createRateLimiter(120, 2);
