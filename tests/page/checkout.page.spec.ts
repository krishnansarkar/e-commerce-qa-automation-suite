import { expect, mergeTests, type Page } from '@playwright/test';
import { test as authTest } from '../../lib/fixtures/auth.fixture';
import { test as adBlockTest } from '../../lib/fixtures/adblock.fixture';
import { createAccountForm } from '../../lib/data/account';
import { ProductsPage } from '../../lib/pages/products.page';
import { CartPage } from '../../lib/pages/cart.page';
import { CheckoutPage } from '../../lib/pages/checkout.page';

/**
 * Authenticated member checkout with ad/tracking requests aborted, which keeps
 * the AdSense vignette from covering the checkout controls.
 */
const test = mergeTests(authTest, adBlockTest);

/** Fill the cart through the listing, then continue to checkout as a member. */
async function reachCheckout(page: Page, ...products: string[]): Promise<void> {
  const catalog = new ProductsPage(page);
  await catalog.goto();

  for (const name of products) {
    await catalog.addToCart(name);
    await catalog.continueShopping();
  }

  const cart = new CartPage(page);
  await cart.goto();
  await cart.proceedToCheckout();
}

test.describe('CheckoutPage POM', () => {
  test('goto() shows the account addresses and the order review', async ({ page, auth }) => {
    await reachCheckout(page, 'Blue Top', 'Men Tshirt');

    const checkout = new CheckoutPage(page);
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(checkout.addressDetailsHeading).toBeVisible();
    await expect(checkout.deliveryAddressHeading).toBeVisible();
    await expect(checkout.billingAddressHeading).toBeVisible();
    await expect(checkout.reviewOrderHeading).toBeVisible();

    // Both addresses are the ones the account was registered with.
    const account = createAccountForm(auth.account);
    const expectedLines = [
      `${account.title}. ${account.firstname} ${account.lastname}`,
      account.company,
      account.address1,
      account.address2,
      `${account.city} ${account.state} ${account.zipcode}`,
      account.country,
      account.mobile_number,
    ];

    for (const address of [checkout.deliveryAddress, checkout.billingAddress]) {
      for (const line of expectedLines) {
        await expect(address).toContainText(line);
      }
    }

    // The review mirrors the cart, and the total row sums the two lines.
    await expect(checkout.productRows).toHaveCount(2);
    await expect(checkout.productName('Blue Top')).toHaveText('Blue Top');
    await expect(checkout.productPrice('Blue Top')).toHaveText('Rs. 500');
    await expect(checkout.productQuantity('Blue Top')).toHaveText('1');
    await expect(checkout.productTotal('Blue Top')).toHaveText('Rs. 500');
    await expect(checkout.productName('Men Tshirt')).toHaveText('Men Tshirt');
    await expect(checkout.productTotal('Men Tshirt')).toHaveText('Rs. 400');
    await expect(checkout.totalAmount).toHaveText('Rs. 900');
  });

  test('placeOrder() keeps the comment and opens the payment page', async ({ page }) => {
    await reachCheckout(page, 'Blue Top');

    const checkout = new CheckoutPage(page);
    const comment = 'Please deliver after 5pm.';
    await checkout.fillComment(comment);
    await expect(checkout.commentInput).toHaveValue(comment);

    await checkout.placeOrder();

    await expect(page).toHaveURL(/\/payment$/);
    await expect(page.getByRole('heading', { name: 'Payment' })).toBeVisible();
  });
});
