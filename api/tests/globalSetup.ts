import { runMigrations, TEST_DB_PATH } from './setup';
import { existsSync, unlinkSync } from 'node:fs';

export async function setup() {
  console.log('[Global Setup] Starting test suite initialization...');
  
  if (existsSync(TEST_DB_PATH)) {
    console.log('[Global Setup] Removing existing test database...');
    unlinkSync(TEST_DB_PATH);
  }
  
  await runMigrations();
  
  console.log('[Global Setup] Test suite initialized successfully');
}

export async function teardown() {
  console.log('[Global Setup] Cleaning up test database...');
  
  if (existsSync(TEST_DB_PATH)) {
    try {
      unlinkSync(TEST_DB_PATH);
      console.log('[Global Setup] Test database removed');
    } catch (error) {
      console.warn('[Global Setup] Could not remove test database:', error);
    }
  }
  
  console.log('[Global Setup] Test suite cleanup complete');
}
