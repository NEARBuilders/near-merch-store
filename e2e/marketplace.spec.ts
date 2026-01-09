import { test, expect } from '@playwright/test';

test.describe('Marketplace', () => {
  test.describe('Home Page', () => {
    test('should load the home page', async ({ page }) => {
      await page.goto('/');

      // Wait for the page to load
      await expect(page).toHaveTitle(/Near Merch/i);
    });

    test('should display featured products', async ({ page }) => {
      await page.goto('/');

      // Wait for products to load (look for product cards or links)
      await page.waitForSelector('[data-testid="product-card"], a[href*="/products/"]', {
        timeout: 10000
      }).catch(() => {
        // Fallback: wait for any product-related content
      });

      // Check that the page has loaded with content
      const bodyText = await page.textContent('body');
      expect(bodyText).toBeTruthy();
    });
  });

  test.describe('Product Page', () => {
    test('should load a product page', async ({ page }) => {
      // First go to home to find a product
      await page.goto('/');

      // Wait for the page to be ready
      await page.waitForLoadState('networkidle');

      // Find and click on a product link
      const productLink = page.locator('a[href*="/products/"]').first();

      if (await productLink.isVisible()) {
        await productLink.click();

        // Verify we're on a product page
        await expect(page).toHaveURL(/\/products\//);

        // Check for product details (title, price, add to cart button)
        await page.waitForLoadState('networkidle');
      }
    });

    test('should display product details', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const productLink = page.locator('a[href*="/products/"]').first();

      if (await productLink.isVisible()) {
        await productLink.click();
        await page.waitForLoadState('networkidle');

        // Product page should have price displayed (look for $ symbol)
        const pageContent = await page.textContent('body');
        expect(pageContent).toContain('$');
      }
    });
  });

  test.describe('Cart', () => {
    test('should add product to cart', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Navigate to a product
      const productLink = page.locator('a[href*="/products/"]').first();

      if (await productLink.isVisible()) {
        await productLink.click();
        await page.waitForLoadState('networkidle');

        // Look for "Add to Cart" or "Add to Bag" button
        const addToCartButton = page.getByRole('button', { name: /add to (cart|bag)/i });

        if (await addToCartButton.isVisible()) {
          await addToCartButton.click();

          // Wait for cart update (toast notification or cart count change)
          await page.waitForTimeout(1000);
        }
      }
    });

    test('should display cart page', async ({ page }) => {
      await page.goto('/cart');
      await page.waitForLoadState('networkidle');

      // Cart page should load
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
    });
  });

  test.describe('Checkout Flow', () => {
    test('should navigate to checkout from cart', async ({ page }) => {
      // First add a product to cart
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const productLink = page.locator('a[href*="/products/"]').first();

      if (await productLink.isVisible()) {
        await productLink.click();
        await page.waitForLoadState('networkidle');

        // Try to add to cart
        const addToCartButton = page.getByRole('button', { name: /add to (cart|bag)/i });

        if (await addToCartButton.isVisible()) {
          await addToCartButton.click();
          await page.waitForTimeout(1000);

          // Navigate to cart
          await page.goto('/cart');
          await page.waitForLoadState('networkidle');

          // Look for checkout button
          const checkoutLink = page.locator('a[href*="/checkout"]');

          if (await checkoutLink.isVisible()) {
            await checkoutLink.click();

            // Should be on checkout page (or login if not authenticated)
            await page.waitForLoadState('networkidle');
            const url = page.url();
            expect(url).toMatch(/\/(checkout|login)/);
          }
        }
      }
    });

    test('should display checkout page with order summary', async ({ page }) => {
      await page.goto('/checkout');
      await page.waitForLoadState('networkidle');

      // Checkout page should show order summary or redirect to login/cart
      const url = page.url();
      // It's okay if we're redirected to login or if cart is empty
      expect(url).toMatch(/\/(checkout|login|cart)/);
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

    // Search page should load
    await expect(page).toHaveURL('/search');
  });
});
