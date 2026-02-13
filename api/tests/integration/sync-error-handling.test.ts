import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getPluginClient, runMigrations, teardown } from '../setup';
import { clearProducts, createSyncState, clearSyncState } from '../helpers';

describe('Sync Error Handling', () => {
  const TEST_USER = 'test-user.near';

  beforeAll(async () => {
    await runMigrations();
  });

  afterAll(async () => {
    await teardown();
  });

  beforeEach(async () => {
    await clearProducts();
    await clearSyncState();
  });

  describe('SYNC_IN_PROGRESS Error (Test T2)', () => {
    it('should throw SYNC_IN_PROGRESS when sync is already running', async () => {
      const client = await getPluginClient({ nearAccountId: TEST_USER });
      
      const syncStartedAt = new Date();
      await createSyncState('products', {
        status: 'running',
        syncStartedAt,
        updatedAt: new Date(),
      });

      await expect(client.sync()).rejects.toThrow();
      
      const result = await client.getSyncStatus();
      expect(result.status).toBe('running');
      expect(result.syncStartedAt).toBe(syncStartedAt.getTime());
    });
  });

  describe('SYNCTimeout - Stale Sync Detection (Test T3)', () => {
    it('should auto-detect and mark stale syncs (>5 min) as error', async () => {
      const client = await getPluginClient({ nearAccountId: TEST_USER });
      
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000 - 1000);
      await createSyncState('products', {
        status: 'running',
        syncStartedAt: fiveMinutesAgo,
        updatedAt: fiveMinutesAgo,
      });

      const result = await client.getSyncStatus();
      expect(result.status).toBe('error');
      expect(result.errorMessage).toContain('timed out');
      expect(result.syncStartedAt).toBe(fiveMinutesAgo.getTime());
    });
  });

  describe('SYNC_PROVIDER_ERROR Scenarios', () => {
    it('should handle SYNC_PROVIDER_ERROR with 503 status', async () => {
      const client = await getPluginClient({ nearAccountId: TEST_USER });

      await createSyncState('products', {
        status: 'error',
        lastErrorAt: new Date(),
        errorMessage: 'Sync failed: Service unavailable',
        errorData: {
          provider: 'printful',
          errorType: 'SERVICE_UNAVAILABLE',
          retryAfter: 60,
          originalMessage: 'Service unavailable',
        },
        updatedAt: new Date(),
      });

      const result = await client.getSyncStatus();
      expect(result.status).toBe('error');
      expect(result.errorMessage).toBe('Sync failed: Service unavailable');
      expect(result.errorData).toMatchObject({
        provider: 'printful',
        errorType: 'SERVICE_UNAVAILABLE',
        retryAfter: 60,
        originalMessage: 'Service unavailable',
      });
    });

    it('should handle SYNC_PROVIDER_ERROR with rate limit (429)', async () => {
      const client = await getPluginClient({ nearAccountId: TEST_USER });

      await createSyncState('products', {
        status: 'error',
        lastErrorAt: new Date(),
        errorMessage: 'Sync failed: Rate limit exceeded',
        errorData: {
          provider: 'printful',
          errorType: 'RATE_LIMIT',
          retryAfter: 120,
          originalMessage: 'Too many requests',
        },
        updatedAt: new Date(),
      });

      const result = await client.getSyncStatus();
      expect(result.status).toBe('error');
      expect(result.errorData?.errorType).toBe('RATE_LIMIT');
      expect(result.errorData?.retryAfter).toBe(120);
    });

    it('should handle SYNC_PROVIDER_ERROR with timeout', async () => {
      const client = await getPluginClient({ nearAccountId: TEST_USER });

      await createSyncState('products', {
        status: 'error',
        lastErrorAt: new Date(),
        errorMessage: 'Sync failed: Request timeout',
        errorData: {
          provider: 'gelato',
          errorType: 'TIMEOUT',
          retryAfter: null,
          originalMessage: 'Request timed out',
        },
        updatedAt: new Date(),
      });

      const result = await client.getSyncStatus();
      expect(result.status).toBe('error');
      expect(result.errorData?.errorType).toBe('TIMEOUT');
      expect(result.errorData?.provider).toBe('gelato');
    });

    it('should handle SYNC_PROVIDER_ERROR with API error', async () => {
      const client = await getPluginClient({ nearAccountId: TEST_USER });

      await createSyncState('products', {
        status: 'error',
        lastErrorAt: new Date(),
        errorMessage: 'Sync failed: API error',
        errorData: {
          provider: 'printful',
          errorType: 'API_ERROR',
          retryAfter: 30,
          originalMessage: 'Invalid API response',
        },
        updatedAt: new Date(),
      });

      const result = await client.getSyncStatus();
      expect(result.status).toBe('error');
      expect(result.errorData?.errorType).toBe('API_ERROR');
    });

    it('should handle SYNC_PROVIDER_ERROR with service unavailable', async () => {
      const client = await getPluginClient({ nearAccountId: TEST_USER });

      await createSyncState('products', {
        status: 'error',
        lastErrorAt: new Date(),
        errorMessage: 'Sync failed: Service unavailable',
        errorData: {
          provider: 'gelato',
          errorType: 'SERVICE_UNAVAILABLE',
          retryAfter: 300,
          originalMessage: 'Service temporarily unavailable',
        },
        updatedAt: new Date(),
      });

      const result = await client.getSyncStatus();
      expect(result.status).toBe('error');
      expect(result.errorData?.errorType).toBe('SERVICE_UNAVAILABLE');
      expect(result.errorData?.retryAfter).toBe(300);
    });
  });

  describe('SYNC_FAILED Scenarios', () => {
    it('should handle SYNC_FAILED with error context', async () => {
      const client = await getPluginClient({ nearAccountId: TEST_USER });

      await createSyncState('products', {
        status: 'error',
        lastErrorAt: new Date(),
        errorMessage: 'Failed to fetch products',
        errorData: {
          stage: 'FETCH_PRODUCTS',
          errorMessage: 'Failed to fetch products',
          syncDuration: 45,
          timestamp: new Date().toISOString(),
        },
        updatedAt: new Date(),
      });

      const result = await client.getSyncStatus();
      expect(result.status).toBe('error');
      expect(result.errorMessage).toBe('Failed to fetch products');
      expect(result.errorData?.stage).toBe('FETCH_PRODUCTS');
      expect(result.errorData?.syncDuration).toBe(45);
    });

    it('should handle SYNC_FAILED with unknown stage', async () => {
      const client = await getPluginClient({ nearAccountId: TEST_USER });

      await createSyncState('products', {
        status: 'error',
        lastErrorAt: new Date(),
        errorMessage: 'Unsync error',
        errorData: {
          stage: 'UNKNOWN',
          errorMessage: 'Unknown error',
        },
        updatedAt: new Date(),
      });

      const result = await client.getSyncStatus();
      expect(result.status).toBe('error');
      expect(result.errorData?.stage).toBe('UNKNOWN');
    });
  });

  describe('getSyncStatus Behavior (Tests T13-T16)', () => {
    it('should return sync status with all fields (Test T13)', async () => {
      const client = await getPluginClient({ nearAccountId: TEST_USER });

      const result = await client.getSyncStatus();
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('lastSuccessAt');
      expect(result).toHaveProperty('lastErrorAt');
      expect(result).toHaveProperty('errorMessage');
      expect(result).toHaveProperty('syncStartedAt');
      expect(result).toHaveProperty('updatedAt');
      expect(result).toHaveProperty('errorData');
      expect(typeof result.updatedAt).toBe('number');
    });

    it('should include lastSuccessAt and lastErrorAt timestamps (Test T14)', async () => {
      const client = await getPluginClient({ nearAccountId: TEST_USER });

      const lastSuccessAt = new Date(Date.now() - 3600000);
      const lastErrorAt = new Date(Date.now() - 1800000);
      
      await createSyncState('products', {
        status: 'idle',
        lastSuccessAt,
        lastErrorAt,
        updatedAt: new Date(),
      });

      const result = await client.getSyncStatus();
      expect(result.lastSuccessAt).toBe(lastSuccessAt.getTime());
      expect(result.lastErrorAt).toBe(lastErrorAt.getTime());
    });

    it('should include errorData in sync status (Test T15)', async () => {
      const client = await getPluginClient({ nearAccountId: TEST_USER });

      const errorData = {
        provider: 'printful',
        errorType: 'RATE_LIMIT',
        retryAfter: 60,
        originalMessage: 'Too many requests',
      };

      await createSyncState('products', {
        status: 'error',
        lastErrorAt: new Date(),
        errorMessage: 'Rate limit exceeded',
        errorData,
        updatedAt: new Date(),
      });

      const result = await client.getSyncStatus();
      expect(result.errorData).toEqual(errorData);
    });

    it('should include updatedAt timestamp (Test T16)', async () => {
      const client = await getPluginClient({ nearAccountId: TEST_USER });

      const updatedAt = new Date();
      await createSyncState('products', {
        status: 'idle',
        updatedAt,
      });

      const result = await client.getSyncStatus();
      expect(result.updatedAt).toBe(updatedAt.getTime());
    });
  });

  describe('Duration Calculation (Tests T17-T20)', () => {
    it('should correctly calculate sync duration (Test T17)', async () => {
      const client = await getPluginClient({ nearAccountId: TEST_USER });

      const syncStartedAt = new Date(Date.now() - 30000);
      const syncDuration = Math.floor((Date.now() - syncStartedAt.getTime()) / 1000);

      await createSyncState('products', {
        status: 'running',
        syncStartedAt,
        updatedAt: new Date(),
      });

      const result = await client.getSyncStatus();
      const calculatedDuration = result.syncStartedAt 
        ? Math.floor((Date.now() - result.syncStartedAt) / 1000)
        : 0;
      
      expect(calculatedDuration).toBeGreaterThanOrEqual(syncDuration);
      expect(calculatedDuration).toBeLessThanOrEqual(syncDuration + 10);
    });

    it('should return duration in seconds (Test T18)', async () => {
      const client = await getPluginClient({ nearAccountId: TEST_USER });

      await createSyncState('products', {
        status: 'idle',
        updatedAt: new Date(),
      });

      const result = await client.getSyncStatus();
      
      if (result.syncStartedAt) {
        const duration = Math.floor((Date.now() - result.syncStartedAt) / 1000);
        expect(duration).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle errorData when sync fails (Test T19)', async () => {
      const client = await getPluginClient({ nearAccountId: TEST_USER });

      const errorData = {
        errorType: 'TIMEOUT',
        errorMessage: 'Request timeout',
        syncDuration: 55,
      };

      await createSyncState('products', {
        status: 'error',
        lastErrorAt: new Date(),
        errorMessage: 'Request timeout',
        errorData,
        updatedAt: new Date(),
      });

      const result = await client.getSyncStatus();
      expect(result.errorData).toEqual(errorData);
    });

    it('should include syncDuration in error data (Test T20)', async () => {
      const client = await getPluginClient({ nearAccountId: TEST_USER });

      const syncDuration = 120;

      await createSyncState('products', {
        status: 'error',
        lastErrorAt: new Date(),
        errorMessage: 'Sync failed',
        errorData: {
          stage: 'FETCH_PRODUCTS',
          errorMessage: 'Failed to fetch',
          syncDuration,
        },
        updatedAt: new Date(),
      });

      const result = await client.getSyncStatus();
      expect(result.errorData?.syncDuration).toBe(syncDuration);
    });
  });

  describe('Error Data Storage and Retrieval', () => {
    it('should persist comprehensive error context', async () => {
      const client = await getPluginClient({ nearAccountId: TEST_USER });

      const errorData = {
        stage: 'SET_STATUS',
        errorMessage: 'Failed to update status',
        provider: 'printful',
        syncDuration: 10,
        timestamp: new Date().toISOString(),
      };

      await createSyncState('products', {
        status: 'error',
        lastErrorAt: new Date(),
        errorMessage: 'Failed to update status',
        errorData,
        updatedAt: new Date(),
      });

      const result = await client.getSyncStatus();
      expect(result.errorData).toMatchObject(errorData);
    });

    it('should handle null error data', async () => {
      const client = await getPluginClient({ nearAccountId: TEST_USER });

      await createSyncState('products', {
        status: 'idle',
        errorData: null,
        updatedAt: new Date(),
      });

      const result = await client.getSyncStatus();
      expect(result.errorData).toBeNull();
    });
  });
});