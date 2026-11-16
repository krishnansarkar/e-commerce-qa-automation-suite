import { test, expect } from '@playwright/test';
import { ProductsPage } from '../../lib/pages/products.page';

test.describe('ProductsPage POM', () => {
  test('every locator resolves and the grid is rendered', async ({ page }) => {
    const products = new ProductsPage(page);
    await products.goto();

    await expect(page).toHaveURL(/\/products$/);
    await expect(products.heading).toBeVisible();

    for (const locator of [
      products.heading,
      products.categoryHeading,
      products.brandsHeading,
      products.searchInput,
      products.searchButton,
    ]) {
      await expect(locator).toHaveCount(1);
      await expect(locator).toBeVisible();
    }

    // The grid renders every product on one page; the search heading and the
    // "Added!" modal are only present in their respective states.
    expect(await products.productCards.count()).toBeGreaterThan(0);
    await expect(products.searchedHeading).toHaveCount(0);
    await expect(products.addedToCartModal).toHaveCount(1);
    await expect(products.addedToCartModal).toBeHidden();
  });

  test('cardFor() addresses a single card with its name and price', async ({ page }) => {
    const products = new ProductsPage(page);
    await products.goto();

    // Each card carries its name twice (info block + hover overlay), so the
    // card-scoped locator must still resolve to exactly one card.
    await expect(products.cardFor('Blue Top')).toHaveCount(1);
    await expect(products.productName('Blue Top')).toHaveText('Blue Top');
    await expect(products.productPrice('Blue Top')).toHaveText('Rs. 500');
  });

  test('search() filters the grid and a zero-result search renders no cards', async ({ page }) => {
    const products = new ProductsPage(page);
    await products.goto();

    await products.search('top');

    await expect(page).toHaveURL(/\/products\?search=top$/);
    await expect(products.searchedHeading).toBeVisible();
    await expect(products.cardFor('Blue Top')).toHaveCount(1);

    await products.search('zzzz-no-such-product');

    await expect(products.searchedHeading).toBeVisible();
    await expect(products.productCards).toHaveCount(0);
  });

  test('addToCart() opens the "Added!" modal and continueShopping() closes it', async ({ page }) => {
    const products = new ProductsPage(page);
    await products.goto();

    await products.addToCart('Blue Top');

    await expect(products.addedToCartModal).toBeVisible();
    await expect(products.addedToCartModal).toContainText('Added!');
    await expect(products.addedToCartModal).toContainText(
      'Your product has been added to cart.',
    );
    await expect(products.viewCartLink).toBeVisible();

    await products.continueShopping();
    await expect(products.addedToCartModal).toBeHidden();
  });

  test('addToCart() persists each product to the cart', async ({ page }) => {
    const products = new ProductsPage(page);
    await products.goto();

    await products.addToCart('Blue Top');
    await products.continueShopping();
    await products.addToCart('Men Tshirt');

    await products.viewCartLink.click();

    await expect(page).toHaveURL(/\/view_cart$/);
    const rows = page.locator('#cart_info_table tbody tr');
    await expect(rows).toHaveCount(2);
    await expect(rows.locator('td.cart_description h4 a')).toHaveText(['Blue Top', 'Men Tshirt']);
  });

  test('viewProduct() opens the product details page', async ({ page }) => {
    const products = new ProductsPage(page);
    await products.goto();

    await products.viewProduct('Men Tshirt');

    await expect(page).toHaveURL(/\/product_details\/2$/);
    await expect(page.getByRole('heading', { name: 'Men Tshirt' })).toBeVisible();
  });

  test('category and brand sidebar filters open their listings', async ({ page }) => {
    const products = new ProductsPage(page);
    await products.goto();

    // Category items stay hidden until their accordion is expanded.
    await products.expandCategory('Kids');
    const topsAndShirts = products.categoryLink('Kids', 'Tops & Shirts');
    await expect(topsAndShirts).toBeVisible();
    await topsAndShirts.click();

    await expect(page).toHaveURL(/\/category_products\/5$/);
    await expect(
      page.getByRole('heading', { name: /Kids - Tops & Shirts Products/i }),
    ).toBeVisible();
    expect(await products.productCards.count()).toBeGreaterThan(0);

    await products.goto();
    await products.openBrand('Polo');

    await expect(page).toHaveURL(/\/brand_products\/Polo$/);
    await expect(page.getByRole('heading', { name: /Brand - Polo Products/i })).toBeVisible();
    expect(await products.productCards.count()).toBeGreaterThan(0);
  });
});
