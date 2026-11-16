import { test, expect, type Page } from '@playwright/test';
import { CartPage } from '../../lib/pages/cart.page';
import { ProductsPage } from '../../lib/pages/products.page';

/** Fill the cart through the listing so the page holds real server-side state. */
async function addProducts(page: Page, ...names: string[]): Promise<void> {
  const products = new ProductsPage(page);
  await products.goto();

  for (const name of names) {
    await products.addToCart(name);
    await products.continueShopping();
  }
}

test.describe('CartPage POM', () => {
  test('goto() renders the empty-cart state', async ({ page }) => {
    const cart = new CartPage(page);
    await cart.goto();

    await expect(page).toHaveURL(/\/view_cart$/);
    await expect(cart.emptyCartMessage).toBeVisible();
    await expect(cart.emptyCartMessage).toContainText('Cart is empty!');
    await expect(cart.emptyCartLink).toHaveAttribute('href', '/products');

    // The table and the checkout button are absent, not merely hidden.
    await expect(cart.cartRows).toHaveCount(0);
    await expect(cart.cartTable).toHaveCount(0);
    await expect(cart.proceedToCheckoutButton).toHaveCount(0);
  });

  test('an added product appears as a row with its price and total', async ({ page }) => {
    const cart = new CartPage(page);
    await addProducts(page, 'Blue Top');
    await cart.goto();

    await expect(cart.cartRows).toHaveCount(1);
    await expect(cart.productName('Blue Top')).toHaveText('Blue Top');
    await expect(cart.productPrice('Blue Top')).toHaveText('Rs. 500');
    await expect(cart.productQuantity('Blue Top')).toHaveText('1');
    await expect(cart.productTotal('Blue Top')).toHaveText('Rs. 500');
    await expect(cart.emptyCartMessage).toBeHidden();
  });

  test('adding the same product again increments its quantity, not the row count', async ({
    page,
  }) => {
    const cart = new CartPage(page);
    await addProducts(page, 'Blue Top', 'Blue Top');
    await cart.goto();

    await expect(cart.cartRows).toHaveCount(1);
    await expect(cart.productQuantity('Blue Top')).toHaveText('2');
    await expect(cart.productPrice('Blue Top')).toHaveText('Rs. 500');
    await expect(cart.productTotal('Blue Top')).toHaveText('Rs. 1000');
  });

  test('removeProduct() deletes rows and reveals the empty-cart message', async ({ page }) => {
    const cart = new CartPage(page);
    await addProducts(page, 'Blue Top', 'Men Tshirt');
    await cart.goto();
    await expect(cart.cartRows).toHaveCount(2);

    await cart.removeProduct('Blue Top');

    await expect(cart.cartRows).toHaveCount(1);
    await expect(cart.rowFor('Blue Top')).toHaveCount(0);
    await expect(cart.productName('Men Tshirt')).toHaveText('Men Tshirt');

    await cart.removeProduct('Men Tshirt');

    await expect(cart.cartRows).toHaveCount(0);
    await expect(cart.emptyCartMessage).toBeVisible();
  });

  test('proceedToCheckout() prompts a guest to sign in', async ({ page }) => {
    const cart = new CartPage(page);
    await addProducts(page, 'Blue Top');
    await cart.goto();

    await cart.proceedToCheckout();

    await expect(cart.checkoutModal).toBeVisible();
    await expect(cart.checkoutModal).toContainText(
      'Register / Login account to proceed on checkout.',
    );
    await expect(cart.checkoutLoginLink).toHaveAttribute('href', '/login');
    await expect(page).toHaveURL(/\/view_cart$/);

    await cart.continueOnCart();
    await expect(cart.checkoutModal).toBeHidden();
  });
});
