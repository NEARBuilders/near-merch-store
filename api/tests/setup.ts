import { migrate } from 'drizzle-orm/libsql/migrator';
import Plugin from '@/index';
import { createDatabase, type Database } from '@/db';
import pluginDevConfig from '../plugin.dev';
import { createPluginRuntime } from 'every-plugin';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unlinkSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const TEST_DB_PATH = join(__dirname, '../.test-db.sqlite');
export const TEST_DB_URL = `file:${TEST_DB_PATH}`;

const TEST_CONFIG = {
  variables: pluginDevConfig.config.variables,
  secrets: {
    API_DATABASE_URL: TEST_DB_URL,
    API_DATABASE_AUTH_TOKEN: undefined,
    PING_WEBHOOK_SECRET: 'whsec_test_secret_key',
  },
};

let _runtime: ReturnType<typeof createPluginRuntime> | null = null;
let _testDb: Database | null = null;
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

export function getTestDb() {
  if (!_testDb) {
    _testDb = createDatabase(TEST_DB_URL);
  }
  return _testDb;
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

export async function getPluginClient(context?: { nearAccountId?: string }) {
  await runMigrations();
  
  const runtime = getRuntime();
  const { createClient } = await runtime.usePlugin(
    pluginDevConfig.pluginId,
    TEST_CONFIG
  );
  return createClient(context);
}

export async function teardown() {
  if (_runtime) {
    await _runtime.shutdown();
    _runtime = null;
  }
  _testDb = null;
  _migrationsRun = false;
}
