import { expect, mergeTests, type Page } from '@playwright/test';
import { test as authTest } from '../../lib/fixtures/auth.fixture';
import { test as adBlockTest } from '../../lib/fixtures/adblock.fixture';
import { createPaymentCard } from '../../lib/data/cards';
import { ProductsPage } from '../../lib/pages/products.page';
import { CartPage } from '../../lib/pages/cart.page';
import { CheckoutPage } from '../../lib/pages/checkout.page';
import { PaymentPage } from '../../lib/pages/payment.page';
import { OrderPlacedPage } from '../../lib/pages/order-placed.page';

/**
 * Authenticated order confirmation with ad/tracking requests aborted, which
 * keeps the AdSense vignette from covering the checkout controls.
 */
const test = mergeTests(authTest, adBlockTest);

/** Buy one product, place the order and pay, landing on /payment_done/<id>. */
async function reachOrderPlaced(page: Page): Promise<void> {
  const catalog = new ProductsPage(page);
  await catalog.goto();
  await catalog.addToCart('Blue Top');
  await catalog.continueShopping();

  const cart = new CartPage(page);
  await cart.goto();
  await cart.proceedToCheckout();

  const checkout = new CheckoutPage(page);
  await checkout.placeOrder();

  const payment = new PaymentPage(page);
  await payment.payAndConfirm(createPaymentCard());
}

test.describe('OrderPlacedPage POM', () => {
  test('confirms the order and exposes the invoice and continue links', async ({ page }) => {
    await reachOrderPlaced(page);

    const done = new OrderPlacedPage(page);
    await expect(page).toHaveURL(/\/payment_done\/\d+$/);
    await expect(done.heading).toBeVisible();
    await expect(done.confirmationMessage).toBeVisible();

    // The page's identity comes from the order id in the URL, which also names
    // the invoice download.
    const orderId = done.orderId();
    expect(orderId).toBeGreaterThan(0);
    await expect(done.downloadInvoiceLink).toHaveAttribute(
      'href',
      `/download_invoice/${orderId}`,
    );
    await expect(done.continueLink).toHaveAttribute('href', '/');
  });

  test('continueToHomepage() returns to the homepage', async ({ page }) => {
    await reachOrderPlaced(page);

    const done = new OrderPlacedPage(page);
    await done.continueToHomepage();

    await expect(page).toHaveURL(/^https:\/\/automationexercise\.com\/$/);
    await expect(page.getByText(/Logged in as/)).toBeVisible();
  });
});
