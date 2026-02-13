import { migrate } from 'drizzle-orm/postgres-js/migrator';
import Plugin from '@/index';
import { createDatabase, type DatabaseType } from '@/db';
import pluginDevConfig from '../plugin.dev';
import { createPluginRuntime } from 'every-plugin';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const TEST_DB_URL = process.env.API_DATABASE_URL || 'postgres://postgres:postgres@localhost:5433/api';

const TEST_CONFIG = {
  variables: pluginDevConfig.config.variables,
  secrets: {
    API_DATABASE_URL: TEST_DB_URL,
    PING_API_KEY: 'test_api_key',
    PING_WEBHOOK_SECRET: 'whsec_test_secret_key',
    // Printful v2 webhook secret is hex; tests compute HMAC over raw body.
    PRINTFUL_WEBHOOK_SECRET: 'a'.repeat(64),
  },
};

let _runtime: ReturnType<typeof createPluginRuntime> | null = null;
let _testDb: DatabaseType | null = null;
let _postgresClient: ReturnType<typeof pg> | null = null;
let _migrationsRun = false;

export function getRuntime() {
  if (!_runtime) {
    _runtime = createPluginRuntime({
      registry: {
        [pluginDevConfig.pluginId]: {
          module: Plugin,
        },
      },
      secrets: {},
    });
  }
  return _runtime;
}

export function getTestDb(): DatabaseType {
  if (!_testDb) {
    if (!_postgresClient) {
      _postgresClient = pg(TEST_DB_URL, {
        max: 2,
        idle_timeout: 20 * 1000,
        connect_timeout: 10 * 1000,
      });
    }

    const { drizzle } = require('drizzle-orm/postgres-js');
    const schema = require('../src/db/schema');
    _testDb = drizzle({ client: _postgresClient, schema });
  }

  const db = _testDb;
  if (!db) {
    throw new Error('Database initialization failed');
  }
  return db;
}

export async function runMigrations() {
  if (_migrationsRun) {
    return;
  }

  const db = getTestDb();
  const migrationsFolder = join(__dirname, '../src/db/migrations');

  console.log(`[Test Setup] Running migrations from: ${migrationsFolder}`);
  console.log(`[Test Setup] Database URL: ${TEST_DB_URL}`);

  try {
    await migrate(db, { migrationsFolder });
    _migrationsRun = true;
    console.log('[Test Setup] Migrations completed successfully');
  } catch (error) {
    console.error('[Test Setup] Migration failed:', error);
    throw error;
  }
}

export async function getPluginClient(context?: { nearAccountId?: string; reqHeaders?: Headers; getRawBody?: () => Promise<string> }) {
  await runMigrations();

  const runtime = getRuntime();
  const { createClient } = await runtime.usePlugin(
    pluginDevConfig.pluginId,
    TEST_CONFIG
  );
  return createClient(context);
}

export async function teardown() {
  _testDb = null;

  if (_postgresClient) {
    await _postgresClient.end();
    _postgresClient = null;
  }

  if (_runtime) {
    await _runtime.shutdown();
    _runtime = null;
  }
  _migrationsRun = false;
}
