import { type Locator, type Page } from '@playwright/test';

/**
 * Page object for https://automationexercise.com/payment_done/<orderId>
 *
 * The final confirmation shown after paying: the order is registered
 * server-side and identified by the id in the URL. There is no `goto()` — the
 * id is minted by `PaymentPage.payAndConfirm()` — but the page is readable at
 * any time for the current session's last order.
 *
 * Notes on the site's markup:
 * - The heading is "Order Placed!" rendered uppercase via CSS, so its
 *   accessible name is "ORDER PLACED!"; role matching is case-insensitive.
 * - "Download Invoice" links to `/download_invoice/<orderId>`, "Continue"
 *   links home.
 * - `Continue` may be covered by an AdSense vignette overlay, so the click goes
 *   through `clickAndNavigate()`.
 */
export class OrderPlacedPage {
  readonly page: Page;

  readonly heading: Locator;
  readonly confirmationMessage: Locator;
  readonly downloadInvoiceLink: Locator;
  readonly continueLink: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole('heading', { name: 'Order Placed!' });
    this.confirmationMessage = page.getByText(
      'Congratulations! Your order has been confirmed!',
    );
    this.downloadInvoiceLink = page.getByRole('link', { name: 'Download Invoice' });
    this.continueLink = page.getByRole('link', { name: 'Continue' });
  }

  /** The order id taken from the current /payment_done/<id> URL. */
  orderId(): number {
    const match = /\/payment_done\/(\d+)/.exec(this.page.url());
    if (!match) {
      throw new Error(`Not on an order confirmation page: ${this.page.url()}`);
    }
    return Number(match[1]);
  }

  /** Follow "Continue" back to the homepage. */
  async continueToHomepage(): Promise<void> {
    await this.continueLink.click();
  }
}
