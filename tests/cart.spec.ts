import { expect } from '@playwright/test';
import { test } from '../lib/fixtures/adblock.fixture';
import { CartPage } from '../lib/pages/cart.page';
import { ProductDetailsPage } from '../lib/pages/product-details.page';

/**
 * Adding items from their details pages.
 *
 * Each product is opened directly by id so the tests do not depend on the
 * listing order. The name and price are read from the details page first and
 * then pinned against the cart row, which is rendered from a separate template.
 *
 * Adding the same product again does not create a second row: the site
 * increments the existing row's quantity and recomputes its total.
 */
test.describe('Cart', () => {
  test('two products added from their details pages appear in the cart', async ({ page }) => {
    const details = new ProductDetailsPage(page);

    // 1. Open the first product directly and save its name and price.
    await details.goto(1);
    const first = {
      name: await details.getProductName(),
      price: await details.getProductPrice(),
    };
    expect(first.name).not.toBe('');
    expect(first.price).toBeGreaterThan(0);

    // 2. Add it to the cart, then do the same for the second product.
    await details.addToCart();

    await details.goto(2);
    const second = {
      name: await details.getProductName(),
      price: await details.getProductPrice(),
    };
    expect(second.name).not.toBe('');
    expect(second.price).toBeGreaterThan(0);

    await details.addToCart();

    // 3. The cart lists exactly the two products, each with the name and price
    //    recorded above, a quantity of one, and a total equal to the price.
    const cart = new CartPage(page);
    await cart.goto();
    await expect(page).toHaveURL(/\/view_cart$/);
    await expect(cart.cartRows).toHaveCount(2);

    for (const product of [first, second]) {
      expect(await cart.getProductName(product.name)).toBe(product.name);
      expect(await cart.getProductPrice(product.name)).toBe(product.price);
      await expect(cart.productQuantity(product.name)).toHaveText('1');
      expect(await cart.getProductTotal(product.name)).toBe(product.price);
    }
  });

  test('adding the same product again accumulates its quantity and total', async ({ page }) => {
    const details = new ProductDetailsPage(page);

    // 1. Open a product directly and save its name and unit price.
    await details.goto(1);
    const name = await details.getProductName();
    const price = await details.getProductPrice();
    expect(name).not.toBe('');
    expect(price).toBeGreaterThan(0);

    // 2. Add two of it and check the single cart row reflects both.
    await details.addToCart(2);

    const cart = new CartPage(page);
    await cart.goto();
    await expect(page).toHaveURL(/\/view_cart$/);
    await expect(cart.cartRows).toHaveCount(1);
    expect(await cart.getProductName(name)).toBe(name);
    expect(await cart.getProductPrice(name)).toBe(price);
    await expect(cart.productQuantity(name)).toHaveText('2');
    expect(await cart.getProductTotal(name)).toBe(price * 2);

    // 3. Add two more of the same product; it joins the existing row rather
    //    than creating a second one, so the quantity and total both double.
    await details.goto(1);
    await details.addToCart(2);

    await cart.goto();
    await expect(cart.cartRows).toHaveCount(1);
    expect(await cart.getProductName(name)).toBe(name);
    expect(await cart.getProductPrice(name)).toBe(price);
    await expect(cart.productQuantity(name)).toHaveText('4');
    expect(await cart.getProductTotal(name)).toBe(price * 4);
  });
});
