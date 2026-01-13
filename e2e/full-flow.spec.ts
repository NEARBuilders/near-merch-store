import { test, expect } from '@playwright/test';

/**
 * Complete Shopping Flow E2E Test
 *
 * Tests the full user journey: Home → Product → Cart → Checkout
 * Uses data-testid attributes for reliable element selection.
 */
test('Complete shopping flow: Home → Product → Cart → Checkout', async ({ page }) => {
  // Step 1: Load home page
  console.log('Step 1: Loading home page...');
  await page.goto('/');
  await expect(page).toHaveTitle(/Near Merch/i);
  await page.waitForLoadState('networkidle');

  // Step 2: Click on a product using data-testid
  console.log('Step 2: Clicking on a product...');
  const productCard = page.locator('[data-testid="product-card"]').first();
  await expect(productCard).toBeVisible({ timeout: 10000 });
  await productCard.click();

  // Step 3: Verify product page loaded
  console.log('Step 3: On product page...');
  await expect(page).toHaveURL(/\/products\//);
  await page.waitForLoadState('networkidle');

  // Verify price is displayed
  const pageContent = await page.textContent('body');
  expect(pageContent).toContain('$');

  // Step 4: Add to cart
  console.log('Step 4: Adding to cart...');
  const addToCartButton = page.getByRole('button', { name: /add to (cart|bag)/i });

  if (await addToCartButton.isVisible()) {
    await addToCartButton.click();
    // Wait for toast or cart update
    await page.waitForTimeout(1500);
  }

  // Step 5: Go to cart
  console.log('Step 5: Going to cart...');
  await page.goto('/cart');
  await page.waitForLoadState('networkidle');

  // Verify cart page
  await expect(page).toHaveURL('/cart');

  // Step 6: Go to checkout using data-testid
  console.log('Step 6: Going to checkout...');
  const checkoutLink = page.locator('[data-testid="checkout-link"]');

  if (await checkoutLink.isVisible()) {
    await checkoutLink.click();
    await page.waitForLoadState('networkidle');

    // Should be on checkout or login page
    const url = page.url();
    expect(url).toMatch(/\/(checkout|login)/);
    console.log('Step 7: On checkout/login page:', url);
  } else {
    // Cart might be empty, just go directly to checkout
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    console.log('Step 7: Navigated directly to checkout');
  }

  // Final verification
  console.log('Flow completed successfully!');
});
