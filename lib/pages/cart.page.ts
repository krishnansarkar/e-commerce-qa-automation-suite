import { type Locator, type Page } from '@playwright/test';
import { dismissPopups } from '../utils/dismiss-popups';

/** How long a cart click may take to register before it is retried. */
const CLICK_SETTLE_MS = 5_000;

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
 * - `#checkoutModal` matches `dismissPopups()` (`.modal.show` with a
 *   `[data-dismiss="modal"]` button), so do not call it between opening the
 *   prompt and asserting on it.
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

  /** Navigate to the cart and clear any popups/overlays. */
  async goto(): Promise<void> {
    await this.page.goto('https://automationexercise.com/view_cart', {
      waitUntil: 'domcontentloaded',
    });
    await dismissPopups(this.page);
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

  /** The quantity shown in a row (read-only on this page). */
  productQuantity(name: string): Locator {
    return this.rowFor(name).locator('td.cart_quantity button');
  }

  /** The row total, i.e. price x quantity. */
  productTotal(name: string): Locator {
    return this.rowFor(name).locator('td.cart_total p');
  }

  /** The row's delete control. */
  deleteButton(name: string): Locator {
    return this.rowFor(name).locator('.cart_quantity_delete');
  }

  /**
   * Delete a product from the cart. Deletion is an AJAX call that removes the
   * row; deleting the last row reveals the empty-cart message.
   *
   * As with adding to cart, the handler comes from cart.js and can be bound
   * after `domcontentloaded`. Each click races its /delete_cart/<id> request
   * against the row disappearing and is repeated only when neither happened.
   */
  async removeProduct(name: string): Promise<void> {
    const row = this.rowFor(name);

    for (let attempt = 0; attempt < 2; attempt++) {
      const requestSent = this.page
        .waitForRequest(/\/delete_cart\/\d+/, { timeout: CLICK_SETTLE_MS })
        .then(() => true)
        .catch(() => false);
      const rowRemoved = row
        .waitFor({ state: 'detached', timeout: CLICK_SETTLE_MS })
        .then(() => true)
        .catch(() => false);

      await this.deleteButton(name).click();

      const registered = await Promise.race([
        requestSent,
        rowRemoved,
        this.page.waitForTimeout(CLICK_SETTLE_MS).then(() => false),
      ]);

      if (registered) {
        break;
      }
    }

    await row.waitFor({ state: 'detached' });
  }

  /**
   * Click "Proceed To Checkout". A guest sees the sign-in prompt modal; a
   * signed-in user is taken to /checkout.
   *
   * An AdSense vignette can cover the button, so a click that produces neither
   * outcome is retried through the element's own click handler.
   */
  async proceedToCheckout(): Promise<void> {
    const settled = (timeout: number): Promise<boolean> =>
      Promise.race([
        this.checkoutModal
          .waitFor({ state: 'visible', timeout })
          .then(() => true)
          .catch(() => false),
        this.page
          .waitForURL(/\/checkout$/, { waitUntil: 'domcontentloaded', timeout })
          .then(() => true)
          .catch(() => false),
      ]);

    await this.proceedToCheckoutButton.click({ timeout: 5_000 }).catch(() => undefined);
    if (await settled(10_000)) {
      return;
    }

    await this.proceedToCheckoutButton.evaluate((element) => (element as HTMLElement).click());
    if (!(await settled(15_000))) {
      throw new Error('Proceed To Checkout opened neither the prompt nor the checkout page.');
    }
  }

  /** Dismiss the guest checkout prompt with "Continue On Cart". */
  async continueOnCart(): Promise<void> {
    await this.continueOnCartButton.click();
    await this.checkoutModal.waitFor({ state: 'hidden' });
  }
}
