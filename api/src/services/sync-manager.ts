import { Effect, Fiber, Ref, Schedule } from 'every-plugin/effect';
import { syncProgressStore } from './sync-progress';

interface ActiveSync {
  fiber: Fiber.RuntimeFiber<unknown, unknown>;
  childFibers: Array<Fiber.RuntimeFiber<unknown, unknown>>;
  startedAt: number;
}

class SyncManager {
  private activeSyncRef: Ref.Ref<ActiveSync | null>;

  constructor() {
    this.activeSyncRef = Ref.unsafeMake<ActiveSync | null>(null);
  }

  startSync<A, E>(effect: Effect.Effect<A, E>): Effect.Effect<Fiber.RuntimeFiber<A, E>> {
    const self = this;
    return Effect.gen(function* () {
      const now = Date.now();
      
      // Wrap the effect to ensure cleanup happens when done
      const wrappedEffect = effect.pipe(
        Effect.ensuring(self.clearSync())
      );
      
      const fiber = yield* Effect.forkDaemon(wrappedEffect);
      
      yield* Ref.set(self.activeSyncRef, {
        fiber: fiber as Fiber.RuntimeFiber<unknown, unknown>,
        childFibers: [],
        startedAt: now,
      });
      
      return fiber;
    });
  }

  registerChildFiber(childFiber: Fiber.RuntimeFiber<unknown, unknown>): Effect.Effect<void> {
    const self = this;
    return Effect.gen(function* () {
      const active = yield* Ref.get(self.activeSyncRef);
      if (active) {
        yield* Ref.set(self.activeSyncRef, {
          ...active,
          childFibers: [...active.childFibers, childFiber],
        });
      }
    });
  }

  cancelSync(): Effect.Effect<boolean> {
    const self = this;
    return Effect.gen(function* () {
      const active = yield* Ref.get(self.activeSyncRef);
      
      if (!active) {
        return false;
      }
      
      // Interrupt all child fibers first
      for (const childFiber of active.childFibers) {
        yield* Fiber.interrupt(childFiber);
      }
      
      // Then interrupt main fiber
      yield* Fiber.interrupt(active.fiber);
      yield* Ref.set(self.activeSyncRef, null);
      
      syncProgressStore.error('Sync cancelled by user');
      
      return true;
    });
  }

  getActiveSync(): Effect.Effect<ActiveSync | null> {
    return Ref.get(this.activeSyncRef);
  }

  isSyncRunning(): Effect.Effect<boolean> {
    const self = this;
    return Effect.gen(function* () {
      const active = yield* Ref.get(self.activeSyncRef);
      if (!active) return false;
      
      const status = yield* Fiber.status(active.fiber);
      return status._tag === 'Running';
    });
  }

  clearSync(): Effect.Effect<void> {
    return Ref.set(this.activeSyncRef, null);
  }
}

export const syncManager = new SyncManager();

export const HEARTBEAT_TIMEOUT_MS = 60000; // 60 seconds

export const createHeartbeat = (lastUpdateTimeRef: Ref.Ref<number>): Effect.Effect<Fiber.RuntimeFiber<number, Error>> =>
  Effect.gen(function* () {
    const check = Effect.gen(function* () {
      const lastUpdate = yield* Ref.get(lastUpdateTimeRef);
      const now = Date.now();
      
      if (now - lastUpdate > HEARTBEAT_TIMEOUT_MS) {
        return yield* Effect.fail(new Error('HEARTBEAT_TIMEOUT'));
      }
    });
    
    // Fork the heartbeat as a child fiber that can be interrupted
    const fiber = yield* Effect.fork(
      Effect.repeat(check, Schedule.spaced('10000 millis'))
    );
    
    // Register with sync manager for cleanup
    yield* syncManager.registerChildFiber(fiber as Fiber.RuntimeFiber<unknown, unknown>);
    
    return fiber;
  });
