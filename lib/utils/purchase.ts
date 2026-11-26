import { readFile } from 'node:fs/promises';
import { expect } from '@playwright/test';
import { createPaymentCard } from '../data/cards';
import type { AccountInfo } from '../data/user';
import { CartPage } from '../pages/cart.page';
import { CheckoutPage } from '../pages/checkout.page';
import type { HomePage } from '../pages/home.page';
import { OrderPlacedPage } from '../pages/order-placed.page';
import { PaymentPage } from '../pages/payment.page';

/** The product a purchase starts with, and the cart state after adding it. */
export interface ProductInCart {
  /** The product's name as shown on its homepage card. */
  name: string;
  /** Cart page, already showing the single-product cart. */
  cart: CartPage;
  /** The cart row total as a number, e.g. 500 for "Rs. 500". */
  cartTotal: number;
}

/** A cart ready to check out, plus the account the order belongs to. */
export interface OrderDetails {
  account: AccountInfo;
  /** Product name as shown in the cart and the checkout review. */
  product: string;
  /** The cart row total as a number, e.g. 500 for "Rs. 500". */
  cartTotal: number;
}

/**
 * Steps 1-2 of the purchase flow: add the first product of the homepage's
 * featured grid and verify the cart lists exactly one unit at that card's
 * price.
 *
 * The product and its expected amount are both read from the card, so the
 * helper stays independent of the catalogue. The homepage is expected to be
 * open already, which lets a caller that needs to inspect the guest header do
 * so first, and keeps the homepage's featured grid covered without navigating
 * to /products.
 */
export async function addFeaturedProductToCart(home: HomePage): Promise<ProductInCart> {
  const name = await home.productsNav.getProductName(0);
  const price = await home.productsNav.getProductPrice(0);

  await home.productsNav.addToCart(0);
  await home.productsNav.continueShopping();

  await home.cartLink.click();
  const cart = new CartPage(home.page);
  await expect(home.page).toHaveURL(/\/view_cart$/);
  await expect(cart.cartRows).toHaveCount(1);
  await expect(cart.productName(name)).toHaveText(name);
  await expect(cart.productQuantity(name)).toHaveText('1');

  const cartTotal = await cart.getCartTotal(name);
  expect(cartTotal).toBe(price);
  return { name, cart, cartTotal };
}

/**
 * Steps 3-5 of the purchase flow: check out a single-product cart, pay with
 * bogus card details and check the downloaded invoice.
 *
 * The invoice greets the customer by first and last name (not the account's
 * display name) and prints the amount without the "Rs." prefix. Returns the
 * invoice's text for callers that want to assert more of it.
 */
export async function placeOrderAndVerifyInvoice(
  cart: CartPage,
  { account, product, cartTotal }: OrderDetails,
): Promise<string> {
  const { page } = cart;

  await cart.proceedToCheckout();
  await expect(page).toHaveURL(/\/checkout$/);

  const checkout = new CheckoutPage(page);
  await expect(checkout.deliveryAddressHeading).toBeVisible();
  await expect(checkout.billingAddressHeading).toBeVisible();

  // Address lines are rendered as plain text, so each expected value is
  // matched as a substring of the printed list.
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

  await expect(checkout.productName(product)).toHaveText(product);
  expect(await checkout.getTotalAmount()).toBe(cartTotal);

  await checkout.placeOrder();
  await expect(page).toHaveURL(/\/payment$/);

  const payment = new PaymentPage(page);
  await payment.payAndConfirm(createPaymentCard());
  const done = new OrderPlacedPage(page);
  await expect(page).toHaveURL(/\/payment_done\/\d+$/);
  await expect(done.heading).toBeVisible();
  await expect(done.confirmationMessage).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    done.downloadInvoiceLink.click(),
  ]);

  expect(await download.failure()).toBeNull();
  expect(download.suggestedFilename()).toBe('invoice.txt');

  const invoicePath = await download.path();
  expect(invoicePath).not.toBeNull();
  const invoice = await readFile(invoicePath as string, 'utf8');

  expect(invoice).toContain(`Hi ${account.firstname} ${account.lastname},`);
  expect(invoice).toContain(`Your total purchase amount is ${cartTotal}`);
  return invoice;
}
