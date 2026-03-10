import type { ProviderProgress, SyncProgress } from '../contract';

export type { ProviderProgress, SyncProgress };

class SyncProgressStore {
  private progress: SyncProgress;
  private subscribers = new Set<(p: SyncProgress) => void>();

  constructor() {
    this.progress = {
      status: 'idle',
      providers: {},
      totalSynced: 0,
      totalFailed: 0,
      totalRemoved: 0,
      timestamp: Date.now(),
      message: undefined,
    };
  }

  updateProvider(provider: string, update: Partial<ProviderProgress> & { timestamp?: number }) {
    const existing = this.progress.providers[provider] || {
      status: 'idle' as const,
      phase: 'init' as const,
      total: 0,
      synced: 0,
      failed: 0,
    };

    this.progress.providers[provider] = {
      status: update.status ?? existing.status,
      phase: update.phase ?? existing.phase,
      total: update.total ?? existing.total,
      synced: update.synced ?? existing.synced,
      failed: update.failed ?? existing.failed,
      currentProduct: update.currentProduct,
      message: update.message,
    };

    this.progress.status = 'syncing';
    this.progress.timestamp = update.timestamp ?? Date.now();
    this.broadcast();
  }

  complete(totals: { synced: number; failed: number; removed: number }) {
    this.progress.status = 'completed';
    this.progress.totalSynced = totals.synced;
    this.progress.totalFailed = totals.failed;
    this.progress.totalRemoved = totals.removed;
    this.progress.timestamp = Date.now();
    this.broadcast();
  }

  error(message: string, provider?: string) {
    this.progress.status = 'error';
    this.progress.message = message;
    this.progress.timestamp = Date.now();
    
    if (provider && this.progress.providers[provider]) {
      const existing = this.progress.providers[provider];
      this.progress.providers[provider] = {
        status: 'error',
        phase: existing.phase,
        total: existing.total,
        synced: existing.synced,
        failed: existing.failed,
        message,
      };
    }
    
    this.broadcast();
  }

  reset() {
    this.progress = {
      status: 'syncing',
      providers: {},
      totalSynced: 0,
      totalFailed: 0,
      totalRemoved: 0,
      timestamp: Date.now(),
      message: undefined,
    };
    this.broadcast();
  }

  get(): SyncProgress {
    return this.progress;
  }

  subscribe(fn: (p: SyncProgress) => void): () => void {
    this.subscribers.add(fn);
    fn(this.progress);
    return () => this.subscribers.delete(fn);
  }

  private broadcast() {
    this.subscribers.forEach(fn => fn(this.progress));
  }
}

export const syncProgressStore = new SyncProgressStore();
