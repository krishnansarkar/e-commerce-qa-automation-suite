import { expect, type Page } from '@playwright/test';
import { test } from '../../lib/fixtures/auth.fixture';
import { createPaymentCard } from '../../lib/data/cards';
import { ProductsPage } from '../../lib/pages/products.page';
import { CartPage } from '../../lib/pages/cart.page';
import { CheckoutPage } from '../../lib/pages/checkout.page';
import { PaymentPage } from '../../lib/pages/payment.page';

/** Buy one product and place the order, landing on /payment. */
async function reachPayment(page: Page): Promise<void> {
  const catalog = new ProductsPage(page);
  await catalog.goto();
  await catalog.addToCart('Blue Top');
  await catalog.continueShopping();

  const cart = new CartPage(page);
  await cart.goto();
  await cart.proceedToCheckout();

  const checkout = new CheckoutPage(page);
  await checkout.placeOrder();
}

test.describe('PaymentPage POM', () => {
  // Each test buys a product, checks out and pays on a slow demo site.
  test.beforeEach(() => {
    test.setTimeout(90_000);
  });

  test('every locator resolves and the form starts empty', async ({ page }) => {
    await reachPayment(page);

    const payment = new PaymentPage(page);
    await expect(page).toHaveURL(/\/payment$/);
    await expect(payment.heading).toBeVisible();

    for (const locator of [
      payment.nameOnCardInput,
      payment.cardNumberInput,
      payment.cvcInput,
      payment.expiryMonthInput,
      payment.expiryYearInput,
      payment.payAndConfirmButton,
    ]) {
      await expect(locator).toHaveCount(1);
      await expect(locator).toBeVisible();
    }

    for (const input of [
      payment.nameOnCardInput,
      payment.cardNumberInput,
      payment.cvcInput,
      payment.expiryMonthInput,
      payment.expiryYearInput,
    ]) {
      await expect(input).toHaveValue('');
    }
  });

  test('fillCard() populates the card form', async ({ page }) => {
    await reachPayment(page);

    const payment = new PaymentPage(page);
    const card = createPaymentCard();
    await payment.fillCard(card);

    await expect(payment.nameOnCardInput).toHaveValue(card.nameOnCard);
    await expect(payment.cardNumberInput).toHaveValue(card.cardNumber);
    await expect(payment.cvcInput).toHaveValue(card.cvc);
    await expect(payment.expiryMonthInput).toHaveValue(card.expiryMonth);
    await expect(payment.expiryYearInput).toHaveValue(card.expiryYear);

    // Still on /payment: filling alone must not submit the order.
    await expect(page).toHaveURL(/\/payment$/);
  });

  test('payAndConfirm() confirms the order', async ({ page }) => {
    await reachPayment(page);

    const payment = new PaymentPage(page);
    await payment.payAndConfirm(createPaymentCard());

    await expect(page).toHaveURL(/\/payment_done\/\d+$/);
    await expect(page.getByRole('heading', { name: 'Order Placed!' })).toBeVisible();
    await expect(
      page.getByText('Congratulations! Your order has been confirmed!'),
    ).toBeVisible();
  });
});
