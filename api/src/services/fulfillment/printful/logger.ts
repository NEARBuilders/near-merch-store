import { Data } from 'every-plugin/effect';

export class SyncPhaseError extends Data.TaggedError('SyncPhaseError')<{
  readonly phase: string;
  readonly operation: string;
  readonly cause: unknown;
}> {}

export interface SyncProgress {
  phase: string;
  current: number;
  total: number;
  item?: string;
  failed?: number;
}

/**
 * Structured logger for sync operations with progress tracking
 */
export class SyncLogger {
  private startTime: number;
  private phase: string = 'init';
  private counts = {
    products: 0,
    variants: 0,
    failed: 0,
  };
  private lastProgressLog = 0;
  private readonly PROGRESS_LOG_INTERVAL = 5000; // Log progress every 5 seconds

  constructor(private readonly syncId: string) {
    this.startTime = Date.now();
    this.logPhase('init', 'Sync started');
  }

  private getElapsed(): string {
    return ((Date.now() - this.startTime) / 1000).toFixed(1);
  }

  /**
   * Log a phase change
   */
  logPhase(phase: string, message: string): void {
    this.phase = phase;
    console.log(`[PrintfulSync:${this.syncId}] [${this.getElapsed()}s] [${phase}] ${message}`);
  }

  /**
   * Log progress with rate limiting to avoid spam
   */
  logProgress(progress: SyncProgress): void {
    const now = Date.now();
    
    // Only log progress every 5 seconds to avoid spam
    if (now - this.lastProgressLog < this.PROGRESS_LOG_INTERVAL) {
      return;
    }
    
    this.lastProgressLog = now;
    
    const percent = progress.total > 0 
      ? ((progress.current / progress.total) * 100).toFixed(0)
      : '0';
    
    const itemStr = progress.item ? ` - ${progress.item}` : '';
    const failedStr = progress.failed && progress.failed > 0 
      ? ` (${progress.failed} failed)` 
      : '';
    
    console.log(
      `[PrintfulSync:${this.syncId}] [${this.getElapsed()}s] [${this.phase}] ` +
      `${progress.current}/${progress.total} (${percent}%)${failedStr}${itemStr}`
    );

    // Update internal counters
    if (progress.failed) {
      this.counts.failed = progress.failed;
    }
  }

  /**
   * Log a success
   */
  logSuccess(item: string, details?: string): void {
    this.counts.products++;
    const detailStr = details ? ` (${details})` : '';
    console.log(
      `[PrintfulSync:${this.syncId}] [${this.getElapsed()}s] [${this.phase}] ✓ ${item}${detailStr}`
    );
  }

  /**
   * Log a failure
   */
  logFailure(item: string, error: unknown): void {
    this.counts.failed++;
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(
      `[PrintfulSync:${this.syncId}] [${this.getElapsed()}s] [${this.phase}] ✗ ${item}: ${errorMessage}`
    );
  }

  /**
   * Log completion with summary
   */
  complete(): void {
    const elapsed = this.getElapsed();
    console.log(
      `[PrintfulSync:${this.syncId}] [${elapsed}s] Complete: ` +
      `${this.counts.products} products, ${this.counts.variants} variants, ${this.counts.failed} failed`
    );
  }

  /**
   * Log an error that stops the sync
   */
  error(error: unknown): void {
    const elapsed = this.getElapsed();
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `[PrintfulSync:${this.syncId}] [${elapsed}s] [ERROR] Sync failed: ${errorMessage}`
    );
  }

  /**
   * Create a child logger for a specific phase
   */
  forPhase(phase: string): SyncLogger {
    const child = Object.create(this);
    child.phase = phase;
    return child;
  }
}

/**
 * Create a new sync logger
 */
export function createSyncLogger(syncId: string): SyncLogger {
  return new SyncLogger(syncId);
}
