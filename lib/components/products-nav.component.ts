import { type Locator, type Page } from '@playwright/test';

/** How long a cart click may take to register before it is retried. */
const CLICK_SETTLE_MS = 5_000;

/**
 * Shared component object for the product-card grid and the "Added!" modal.
 *
 * Both the homepage's "Features Items" and the /products "All Products" grid
 * render the same `.product-image-wrapper` cards, so the card interactions live
 * here instead of being duplicated by each page object.
 *
 * Notes on the site's markup:
 * - Each card contains two "Add to cart" anchors (one in the info block, one
 *   in the hover overlay), so anchor counts are doubled and locators must be
 *   scoped to a card and pinned with `.first()`.
 * - "Add to cart" is an `<a>` without an `href`, so it has no link role and is
 *   addressed through its `.add-to-cart` class instead.
 * - Adding to cart is an AJAX call; on success the site shows the "Added!"
 *   modal (`#cartModal`), which covers the listing until it is dismissed with
 *   "Continue Shopping".
 * - The click handler comes from /static/js/cart.js, which can still be running
 *   after `domcontentloaded`; a click in that window does nothing at all. Each
 *   click therefore races its /add_to_cart/<id> request against the modal
 *   appearing, and is repeated only when neither happened — so a slow response
 *   (or a cached one that emits no request event) is never added twice.
 */
export class ProductsNavComponent {
  readonly page: Page;

  readonly productCards: Locator;

  readonly addedToCartModal: Locator;
  readonly viewCartLink: Locator;
  readonly continueShoppingButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.productCards = page.locator('.product-image-wrapper');

    this.addedToCartModal = page.locator('#cartModal');
    this.viewCartLink = this.addedToCartModal.getByRole('link', { name: 'View Cart' });
    this.continueShoppingButton = this.addedToCartModal.getByRole('button', {
      name: 'Continue Shopping',
    });
  }

  /** The card for a product, matched on its name. */
  cardFor(name: string): Locator {
    return this.productCards.filter({ has: this.page.getByText(name, { exact: true }) });
  }

  /** The name shown on a product's card. */
  productName(name: string): Locator {
    return this.cardFor(name).locator('.productinfo p').first();
  }

  /** The price shown on a product's card, e.g. "Rs. 500". */
  productPrice(name: string): Locator {
    return this.cardFor(name).locator('.productinfo h2').first();
  }

  /**
   * Add a product to the cart and wait for the "Added!" modal.
   *
   * Uses the first "Add to cart" anchor of the card (the info block one; the
   * second belongs to the hover overlay). Cart state is server-side and shared
   * by the whole browser context.
   */
  async addToCart(name: string): Promise<void> {
    const addButton = this.cardFor(name).locator('.add-to-cart').first();

    // The modal covers the listing, so it must be dismissed before clicking.
    await this.addedToCartModal.waitFor({ state: 'hidden' });

    for (let attempt = 0; attempt < 2; attempt++) {
      const requestSent = this.page
        .waitForRequest(/\/add_to_cart\/\d+/, { timeout: CLICK_SETTLE_MS })
        .then(() => true)
        .catch(() => false);
      const modalShown = this.addedToCartModal
        .waitFor({ state: 'visible', timeout: CLICK_SETTLE_MS })
        .then(() => true)
        .catch(() => false);

      await addButton.click();

      const registered = await Promise.race([
        requestSent,
        modalShown,
        this.page.waitForTimeout(CLICK_SETTLE_MS).then(() => false),
      ]);

      if (registered) {
        break;
      }
    }

    await this.addedToCartModal.waitFor({ state: 'visible' });
  }

  /** Dismiss the "Added!" modal with its "Continue Shopping" button. */
  async continueShopping(): Promise<void> {
    await this.continueShoppingButton.click();
    await this.addedToCartModal.waitFor({ state: 'hidden' });
  }

  /** Open a product's details page from its card. */
  async viewProduct(name: string): Promise<void> {
    await this.cardFor(name).getByRole('link', { name: 'View Product' }).click();
    await this.page.waitForURL(/\/product_details\/\d+$/, { waitUntil: 'domcontentloaded' });
  }
}
