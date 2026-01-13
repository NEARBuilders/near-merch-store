import { test as setup, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const authFile = '.auth/user.json';

/**
 * Authentication Setup
 *
 * This setup project runs before all tests and saves the authenticated state.
 * Subsequent tests use this saved state via storageState configuration,
 * avoiding the need to repeat login flows in each test.
 */
setup('authenticate', async ({ page }) => {
  // Ensure .auth directory exists
  const authDir = path.dirname(authFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Navigate to the app
  await page.goto('/');
  await expect(page).toHaveTitle(/Near Merch/i);

  // For NEAR wallet authentication, we simulate the authenticated state
  // by setting the necessary localStorage/sessionStorage values.
  // In a real scenario, this would involve actual wallet connection.

  // Set mock authentication state for testing
  await page.evaluate(() => {
    // Set any auth-related localStorage items your app uses
    // This simulates a logged-in user state for testing purposes
    localStorage.setItem('near_wallet_connected', 'true');
    localStorage.setItem('near_test_account', 'testuser.testnet');
  });

  // Wait for any auth state to propagate
  await page.waitForTimeout(500);

  // Save the authenticated state
  await page.context().storageState({ path: authFile });
});
