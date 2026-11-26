import { type Locator, type Page } from '@playwright/test';
import { parseAmount } from '../utils/amount';

/**
 * Page object for https://automationexercise.com/view_cart
 *
 * The session-backed shopping cart: an empty-cart message until the first
 * product is added, then a table with one row per product plus a
 * "Proceed To Checkout" button.
 *
 * Notes on the site's markup:
 * - An empty cart renders only `#empty_cart`; `#cart_info_table` and
 *   `#do_action` are not in the DOM at all, so their locators resolve to zero
 *   elements rather than to hidden ones.
 * - Rows are keyed by product id (`<tr id="product-1">`). Adding the same
 *   product again does not create a second row: it increments the quantity and
 *   recomputes the row total.
 * - The quantity is a disabled `<button>`, not an input; it can only be changed
 *   from the product details page, so this page only reads it.
 * - "Proceed To Checkout" is an `<a class="check_out">` without an `href` and
 *   therefore has neither the link nor the button role; delete controls are
 *   href-less anchors for the same reason.
 * - Guests get the `#checkoutModal` prompt; signed-in users are redirected
 *   straight to /checkout.
 */
export class CartPage {
  readonly page: Page;

  // Empty state
  readonly emptyCartMessage: Locator;
  readonly emptyCartLink: Locator;

  // Populated state
  readonly cartTable: Locator;
  readonly cartRows: Locator;
  readonly proceedToCheckoutButton: Locator;

  // Guest checkout prompt
  readonly checkoutModal: Locator;
  readonly checkoutLoginLink: Locator;
  readonly continueOnCartButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.emptyCartMessage = page.locator('#empty_cart p');
    this.emptyCartLink = page.locator('#empty_cart a');

    this.cartTable = page.locator('#cart_info_table');
    this.cartRows = page.locator('#cart_info_table tbody tr');
    this.proceedToCheckoutButton = page.locator('a.check_out');

    this.checkoutModal = page.locator('#checkoutModal');
    this.checkoutLoginLink = this.checkoutModal.getByRole('link', { name: 'Register / Login' });
    this.continueOnCartButton = this.checkoutModal.getByRole('button', { name: 'Continue On Cart' });
  }

  /** Navigate to the cart. */
  async goto(): Promise<void> {
    await this.page.goto('https://automationexercise.com/view_cart', {
      waitUntil: 'domcontentloaded',
    });
  }

  /** The table row for a product, matched on its name link. */
  rowFor(name: string): Locator {
    return this.cartRows.filter({ has: this.page.getByRole('link', { name }) });
  }

  /** The product name shown in a row. */
  productName(name: string): Locator {
    return this.rowFor(name).locator('td.cart_description h4 a');
  }

  /** The unit price shown in a row, e.g. "Rs. 500". */
  productPrice(name: string): Locator {
    return this.rowFor(name).locator('td.cart_price p');
  }

  /** Extract the product name shown in a row. */
  async getProductName(name: string): Promise<string> {
    return (await this.productName(name).innerText()).trim();
  }

  /** Extract the unit price shown in a row as a number, e.g. 500 for "Rs. 500". */
  async getProductPrice(name: string): Promise<number> {
    return parseAmount(await this.productPrice(name).innerText());
  }

  /** The quantity shown in a row (read-only on this page). */
  productQuantity(name: string): Locator {
    return this.rowFor(name).locator('td.cart_quantity button');
  }

  /** The row total, i.e. price x quantity. */
  productTotal(name: string): Locator {
    return this.rowFor(name).locator('td.cart_total p');
  }

  /** Extract the row total, i.e. price x quantity, as a number. */
  async getProductTotal(name: string): Promise<number> {
    return parseAmount(await this.productTotal(name).innerText());
  }

  /** Extract the cart total for a product's row as a number, e.g. 500. */
  async getCartTotal(name: string): Promise<number> {
    return this.getProductTotal(name);
  }

  /** The row's delete control. */
  deleteButton(name: string): Locator {
    return this.rowFor(name).locator('.cart_quantity_delete');
  }

  /** Delete a product from the cart and wait for its row to disappear. */
  async removeProduct(name: string): Promise<void> {
    const row = this.rowFor(name);
    await this.deleteButton(name).click();
    await row.waitFor({ state: 'detached' });
  }

  /**
   * Click "Proceed To Checkout" as a signed-in user and land on /checkout.
   *
   * The control is a href-less anchor whose click handler the site registers
   * in inline JS at the end of the page, so the click is only sent once the
   * page has fully loaded; otherwise it can land before the handler exists and
   * be silently ignored.
   */
  async proceedToCheckout(): Promise<void> {
    await this.page.waitForLoadState('load');
    await this.proceedToCheckoutButton.click();
    await this.page.waitForURL(/\/checkout$/);
  }

  /**
   * Click "Proceed To Checkout" as a guest. The site answers with the
   * `#checkoutModal` sign-in prompt instead of going to /checkout.
   */
  async openGuestCheckoutPrompt(): Promise<void> {
    await this.page.waitForLoadState('load');
    await this.proceedToCheckoutButton.click();
    await this.checkoutModal.waitFor({ state: 'visible' });
  }

  /**
   * Follow the guest prompt's "Register / Login" link to the login page. The
   * cart survives the round trip, so the guest can check out once signed in.
   */
  async openLoginFromCheckoutPrompt(): Promise<void> {
    await this.checkoutLoginLink.click();
    await this.page.waitForURL(/\/login$/);
  }

  /** Dismiss the guest checkout prompt with "Continue On Cart". */
  async continueOnCart(): Promise<void> {
    await this.continueOnCartButton.click();
    await this.checkoutModal.waitFor({ state: 'hidden' });
  }
}
