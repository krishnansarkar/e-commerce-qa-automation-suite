import { type Locator, type Page } from '@playwright/test';
import { parseAmount } from '../utils/amount';

/**
 * Page object for https://automationexercise.com/checkout
 *
 * The one-page checkout shown to signed-in users: delivery and billing
 * addresses, a read-only review of the order, an optional comment box and a
 * "Place Order" action. Reached from `CartPage.proceedToCheckout()`; a guest is
 * stopped by the cart's sign-in prompt instead, so this page is only meaningful
 * with a session (a direct GET renders an empty review table).
 *
 * Notes on the site's markup:
 * - The addresses are plain `<ul>` lists (`#address_delivery`, `#address_invoice`)
 *   whose first item is the heading; values are not labelled per field.
 * - The review table is `<table id="cart_info" class="table table-condensed">`,
 *   i.e. `#cart_info` is the table itself (unlike /view_cart, where it is a
 *   wrapper around `#cart_info_table`). Product rows keep the cart's
 *   `id="product-<id>"` and `td.cart_*` classes; the final row carries the
 *   "Total Amount" label and a `p.cart_total_price`.
 * - "Place Order" is a real link to /payment, but an AdSense vignette overlay
 *   can block the pointer, so the click goes through `clickAndNavigate()`.
 */
export class CheckoutPage {
  readonly page: Page;

  // Address details
  readonly addressDetailsHeading: Locator;
  readonly deliveryAddress: Locator;
  readonly deliveryAddressHeading: Locator;
  readonly billingAddress: Locator;
  readonly billingAddressHeading: Locator;

  // Order review
  readonly reviewOrderHeading: Locator;
  readonly reviewTable: Locator;
  readonly productRows: Locator;
  readonly totalAmount: Locator;

  // Order comment and submission
  readonly commentInput: Locator;
  readonly placeOrderLink: Locator;

  constructor(page: Page) {
    this.page = page;

    this.addressDetailsHeading = page.getByRole('heading', { name: 'Address Details' });
    this.deliveryAddress = page.locator('#address_delivery');
    this.deliveryAddressHeading = this.deliveryAddress.getByRole('heading', {
      name: 'Your delivery address',
    });
    this.billingAddress = page.locator('#address_invoice');
    this.billingAddressHeading = this.billingAddress.getByRole('heading', {
      name: 'Your billing address',
    });

    this.reviewOrderHeading = page.getByRole('heading', { name: 'Review Your Order' });
    this.reviewTable = page.locator('#cart_info');
    this.productRows = this.reviewTable.locator('tbody tr[id^="product-"]');
    this.totalAmount = this.reviewTable.locator('tbody tr').last().locator('p.cart_total_price');

    this.commentInput = page.locator('textarea[name="message"]');
    this.placeOrderLink = page.getByRole('link', { name: 'Place Order' });
  }

  /** The review row for a product, matched on its name link. */
  rowFor(name: string): Locator {
    return this.productRows.filter({ has: this.page.getByRole('link', { name }) });
  }

  /** The product name shown in a review row. */
  productName(name: string): Locator {
    return this.rowFor(name).locator('td.cart_description h4 a');
  }

  /** The unit price shown in a review row, e.g. "Rs. 500". */
  productPrice(name: string): Locator {
    return this.rowFor(name).locator('td.cart_price p');
  }

  /** The quantity shown in a review row. */
  productQuantity(name: string): Locator {
    return this.rowFor(name).locator('td.cart_quantity button');
  }

  /** The line total shown in a review row. */
  productTotal(name: string): Locator {
    return this.rowFor(name).locator('td.cart_total p');
  }

  /** Extract the order's total amount as a number, e.g. 500 for "Rs. 500". */
  async getTotalAmount(): Promise<number> {
    return parseAmount(await this.totalAmount.innerText());
  }

  /** Fill the optional "comment about your order" box. */
  async fillComment(comment: string): Promise<void> {
    await this.commentInput.fill(comment);
  }

  /** Place the order and land on the payment page. */
  async placeOrder(): Promise<void> {
    await this.placeOrderLink.click();
  }
}
