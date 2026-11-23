import { readFile } from 'node:fs/promises';
import { expect, mergeTests } from '@playwright/test';
import { test as authTest } from '../lib/fixtures/auth.fixture';
import { test as adBlockTest } from '../lib/fixtures/adblock.fixture';
import { createPaymentCard } from '../lib/data/cards';
import { HomePage } from '../lib/pages/home.page';
import { CartPage } from '../lib/pages/cart.page';
import { CheckoutPage } from '../lib/pages/checkout.page';
import { PaymentPage } from '../lib/pages/payment.page';
import { OrderPlacedPage } from '../lib/pages/order-placed.page';

/**
 * Authenticated purchase with ad/tracking requests aborted, so no AdSense
 * overlay can cover "Place Order", "Pay and Confirm Order" or the invoice link.
 */
const test = mergeTests(authTest, adBlockTest);

test.describe('Purchase e2e', () => {
  test('a signed-in user buys a product and downloads a matching invoice', async ({
    page,
    auth,
  }) => {
    const account = auth.account;

    // 1. Start on the homepage and add the product from its featured grid. Its
    //    cards share the product component with /products, so the same
    //    add-to-cart flow works without navigating away.
    const home = new HomePage(page);
    await home.goto();

    await home.productsNav.addToCart('Blue Top');
    await home.productsNav.continueShopping();

    // 2. Cart: the product is there and the total is correct. Keep the total;
    //    the invoice must report the same amount.
    await home.cartLink.click();
    const cart = new CartPage(page);
    await expect(page).toHaveURL(/\/view_cart$/);
    await expect(cart.cartRows).toHaveCount(1);
    await expect(cart.productName('Blue Top')).toHaveText('Blue Top');
    await expect(cart.productQuantity('Blue Top')).toHaveText('1');

    const cartTotal = (await cart.productTotal('Blue Top').innerText()).trim();
    expect(cartTotal).toBe('Rs. 500');

    // 3. Checkout: delivery and billing addresses are the account's, and the
    //    review shows the same product and total.
    await cart.proceedToCheckout();
    const checkout = new CheckoutPage(page);
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(checkout.deliveryAddressHeading).toBeVisible();
    await expect(checkout.billingAddressHeading).toBeVisible();

    const expectedAddressLines = [
      `${account.title}. ${account.firstname} ${account.lastname}`,
      account.company,
      account.address1,
      account.address2,
      `${account.city} ${account.state} ${account.zipcode}`,
      account.country,
      account.mobile_number,
    ];
    for (const address of [checkout.deliveryAddress, checkout.billingAddress]) {
      for (const line of expectedAddressLines) {
        await expect(address).toContainText(line);
      }
    }

    await expect(checkout.productName('Blue Top')).toHaveText('Blue Top');
    await expect(checkout.totalAmount).toHaveText(cartTotal);

    // 4. Place the order and pay with bogus card details.
    await checkout.placeOrder();
    await expect(page).toHaveURL(/\/payment$/);

    const payment = new PaymentPage(page);
    await payment.payAndConfirm(createPaymentCard());
    const done = new OrderPlacedPage(page);
    await expect(page).toHaveURL(/\/payment_done\/\d+$/);
    await expect(done.heading).toBeVisible();
    await expect(done.confirmationMessage).toBeVisible();

    // 5. Download the invoice and check its greeting and amount. The invoice
    //    greets the customer by first and last name (not the account's display
    //    name) and prints the amount without the "Rs." prefix.
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      done.downloadInvoiceLink.click(),
    ]);

    expect(await download.failure()).toBeNull();
    expect(download.suggestedFilename()).toBe('invoice.txt');

    const invoicePath = await download.path();
    expect(invoicePath).not.toBeNull();
    const invoice = await readFile(invoicePath as string, 'utf8');

    const invoiceAmount = cartTotal.replace(/\D/g, '');
    expect(invoice).toContain(`Hi ${account.firstname} ${account.lastname},`);
    expect(invoice).toContain(`Your total purchase amount is ${invoiceAmount}`);
  });
});
