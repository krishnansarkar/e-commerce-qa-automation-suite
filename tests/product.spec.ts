import { expect } from '@playwright/test';
import { test } from '../lib/fixtures/adblock.fixture';
import { ProductDetailsPage } from '../lib/pages/product-details.page';
import { ProductsPage } from '../lib/pages/products.page';

/**
 * Product listing -> details parity.
 *
 * The listing and the details page both render the product's name and price,
 * but from separate templates. This test pins the first card to its details
 * page so a change to either template cannot silently drift.
 */
test.describe('Product details', () => {
  test('the first product card matches its details page', async ({ page }) => {
    // 1. Open the "All Products" listing.
    const products = new ProductsPage(page);
    await products.goto();
    await expect(products.heading).toBeVisible();

    // 2. Save the first product's name and price from its card.
    const firstCard = products.productsNav.cardAt(0);
    await expect(firstCard).toBeVisible();

    const name = await products.getProductName(0);
    const price = await products.getProductPrice(0);
    expect(name).not.toBe('');
    expect(price).toBeGreaterThan(0);

    // 3. Follow that card's "View Product" link to its details page.
    await products.productsNav.viewProductAt(0);

    // 4. The details page shows the same name and price.
    const details = new ProductDetailsPage(page);
    await expect(page).toHaveURL(/\/product_details\/\d+$/);
    expect(await details.getProductName()).toBe(name);
    expect(await details.getProductPrice()).toBe(price);
  });
});

/**
 * Search -> listing parity.
 *
 * Searching for a product's name must return that product from the same
 * template, so the first result should be the card we started from.
 */
test.describe('Product search', () => {
  test('searching the first card name returns the same card', async ({ page }) => {
    // 1. Open the "All Products" listing and save the first card.
    const products = new ProductsPage(page);
    await products.goto();
    await expect(products.heading).toBeVisible();

    const name = await products.getProductName(0);
    const price = await products.getProductPrice(0);
    expect(name).not.toBe('');
    expect(price).toBeGreaterThan(0);

    // 2. Search for the name shown on that card.
    await products.search(name);
    await expect(products.searchedHeading).toBeVisible();

    // 3. The first result is the same card.
    expect(await products.getProductName(0)).toBe(name);
    expect(await products.getProductPrice(0)).toBe(price);
  });
});
