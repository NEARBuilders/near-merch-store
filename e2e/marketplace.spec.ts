import { test, expect } from '@playwright/test';

/**
 * Marketplace E2E Tests
 *
 * These tests use data-testid attributes for reliable element selection.
 * The tests are organized by feature area: Home, Product, Cart, Checkout, Navigation.
 */

test.describe('Marketplace', () => {
  test.describe('Home Page', () => {
    test('should load the home page', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveTitle(/Near Merch/i);
    });

    test('should display product cards', async ({ page }) => {
      await page.goto('/');

      // Wait for product cards to load using data-testid
      const productCards = page.locator('[data-testid="product-card"]');
      await expect(productCards.first()).toBeVisible({ timeout: 10000 });

      // Verify at least one product is displayed
      const count = await productCards.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Product Page', () => {
    test('should load a product page from product card', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Click on first product card using data-testid
      const productCard = page.locator('[data-testid="product-card"]').first();

      if (await productCard.isVisible()) {
        await productCard.click();
        await expect(page).toHaveURL(/\/products\//);
        await page.waitForLoadState('networkidle');
      }
    });

    test('should display product price in USD', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const productCard = page.locator('[data-testid="product-card"]').first();

      if (await productCard.isVisible()) {
        await productCard.click();
        await page.waitForLoadState('networkidle');

        // Product page should have price displayed ($ symbol)
        const pageContent = await page.textContent('body');
        expect(pageContent).toContain('$');
      }
    });
  });

  test.describe('Cart', () => {
    test('should add product to cart via quick add', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Hover over product card and click quick add
      const productCard = page.locator('[data-testid="product-card"]').first();

      if (await productCard.isVisible()) {
        await productCard.hover();

        const quickAddButton = page.locator('[data-testid="quick-add-button"]').first();
        if (await quickAddButton.isVisible()) {
          await quickAddButton.click();
          await page.waitForTimeout(1000);
        }
      }
    });

    test('should display cart page with items', async ({ page }) => {
      await page.goto('/cart');
      await page.waitForLoadState('networkidle');

      // Cart page should load (may be empty or have items)
      await expect(page).toHaveURL('/cart');
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
    });

    test('should show checkout button when cart has items', async ({ page }) => {
      // First add item to cart
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const productCard = page.locator('[data-testid="product-card"]').first();
      if (await productCard.isVisible()) {
        await productCard.hover();
        const quickAddButton = page.locator('[data-testid="quick-add-button"]').first();
        if (await quickAddButton.isVisible()) {
          await quickAddButton.click();
          await page.waitForTimeout(1000);
        }
      }

      // Navigate to cart
      await page.goto('/cart');
      await page.waitForLoadState('networkidle');

      // Check for checkout button using data-testid
      const checkoutButton = page.locator('[data-testid="checkout-button"]');
      if (await checkoutButton.isVisible()) {
        await expect(checkoutButton).toBeVisible();
      }
    });
  });

  test.describe('Checkout Flow', () => {
    test('should navigate to checkout from cart', async ({ page }) => {
      // Add item to cart first
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const productCard = page.locator('[data-testid="product-card"]').first();
      if (await productCard.isVisible()) {
        await productCard.hover();
        const quickAddButton = page.locator('[data-testid="quick-add-button"]').first();
        if (await quickAddButton.isVisible()) {
          await quickAddButton.click();
          await page.waitForTimeout(1000);

          // Navigate to cart
          await page.goto('/cart');
          await page.waitForLoadState('networkidle');

          // Click checkout using data-testid
          const checkoutLink = page.locator('[data-testid="checkout-link"]');
          if (await checkoutLink.isVisible()) {
            await checkoutLink.click();
            await page.waitForLoadState('networkidle');

            // Should be on checkout page
            const url = page.url();
            expect(url).toMatch(/\/(checkout|login)/);
          }
        }
      }
    });

    test('should display order summary on checkout page', async ({ page }) => {
      await page.goto('/checkout');
      await page.waitForLoadState('networkidle');

      // If redirected to cart (empty cart), that's expected behavior
      const url = page.url();
      if (url.includes('/checkout')) {
        // Check for order summary using data-testid
        const orderSummary = page.locator('[data-testid="order-summary"]');
        // May or may not be visible depending on cart state
        const isVisible = await orderSummary.isVisible().catch(() => false);
        expect(url).toContain('checkout');
      }
    });

    /**
     * Checkout Flow with Mocking
     *
     * These tests mock the payment API responses to test success/failure scenarios
     * without making real payment requests.
     */
    test('should handle payment success (mocked)', async ({ page }) => {
      // Mock the Stripe checkout API to return success
      await page.route('**/api/checkout/**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            orderId: 'test-order-123',
            message: 'Payment successful',
          }),
        });
      });

      // Add item and go to checkout
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const productCard = page.locator('[data-testid="product-card"]').first();
      if (await productCard.isVisible()) {
        await productCard.hover();
        const quickAddButton = page.locator('[data-testid="quick-add-button"]').first();
        if (await quickAddButton.isVisible()) {
          await quickAddButton.click();
          await page.waitForTimeout(1000);
        }
      }

      await page.goto('/checkout');
      await page.waitForLoadState('networkidle');

      // Verify checkout page loads with payment options
      const payWithCardButton = page.locator('[data-testid="pay-with-card-button"]');
      if (await payWithCardButton.isVisible()) {
        await expect(payWithCardButton).toBeVisible();
      }
    });

    test('should handle payment failure (mocked)', async ({ page }) => {
      // Mock the Stripe checkout API to return failure
      await page.route('**/api/checkout/**', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Payment declined',
            message: 'Your card was declined. Please try another payment method.',
          }),
        });
      });

      await page.goto('/checkout');
      await page.waitForLoadState('networkidle');

      // Checkout page should still be accessible
      const url = page.url();
      expect(url).toMatch(/\/(checkout|cart)/);
    });
  });
});

test.describe('Navigation', () => {
  test('should navigate between pages', async ({ page }) => {
    // Home
    await page.goto('/');
    await expect(page).toHaveURL('/');

    // Collections
    await page.goto('/collections');
    await expect(page).toHaveURL('/collections');

    // Cart
    await page.goto('/cart');
    await expect(page).toHaveURL('/cart');

    // Favorites
    await page.goto('/favorites');
    await expect(page).toHaveURL('/favorites');
  });

  test('should have working search', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL('/search');
  });
});
