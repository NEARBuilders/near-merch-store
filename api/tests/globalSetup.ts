import { runMigrations } from './setup';

export async function setup() {
  console.log('[Global Setup] Starting test suite initialization...');
  
  await runMigrations();
  
  console.log('[Global Setup] Test suite initialized successfully');
}

export async function teardown() {
  console.log('[Global Setup] Test suite cleanup complete');
}
