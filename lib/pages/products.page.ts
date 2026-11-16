import { type Locator, type Page } from '@playwright/test';
import { dismissPopups } from '../utils/dismiss-popups';

/** How long a cart click may take to register before it is retried. */
const CLICK_SETTLE_MS = 5_000;

/** Sidebar category accordions, expanded on demand. */
export type Category = 'Women' | 'Men' | 'Kids';

/**
 * Page object for https://automationexercise.com/products
 *
 * The "All Products" listing: a search bar, a sidebar with collapsible
 * categories and brands, and a grid of product cards. Every card offers
 * "Add to cart" and "View Product".
 *
 * Notes on the site's markup:
 * - All products are rendered on one page; there is no pagination.
 * - Each card contains two "Add to cart" anchors (one in the info block, one
 *   in the hover overlay), so anchor counts are doubled and locators must be
 *   scoped to a card and pinned with `.first()`.
 * - "Add to cart" is an `<a>` without an `href`, so it has no link role and is
 *   addressed through its `.add-to-cart` class instead.
 * - Adding to cart is an AJAX call; on success the site shows the "Added!"
 *   modal (`#cartModal`). That modal matches `dismissPopups()` (`.modal.show`
 *   with a `[data-dismiss="modal"]` button), so do not call it between adding a
 *   product and asserting on the modal.
 * - Category links are Bootstrap collapse toggles: the items are in the DOM but
 *   hidden until the category is expanded.
 * - Brand links carry the product count in their accessible name (e.g. "(6)Polo"),
 *   so they are matched by text rather than by role name.
 * - The `load` event can stall on ads, so navigations wait for `domcontentloaded`.
 */
export class ProductsPage {
  readonly page: Page;

  // Page-level landmarks
  readonly heading: Locator;
  readonly searchedHeading: Locator;
  readonly categoryHeading: Locator;
  readonly brandsHeading: Locator;

  // Search
  readonly searchInput: Locator;
  readonly searchButton: Locator;

  // Product grid
  readonly productCards: Locator;

  // "Added!" cart confirmation modal
  readonly addedToCartModal: Locator;
  readonly viewCartLink: Locator;
  readonly continueShoppingButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole('heading', { name: 'All Products' });
    this.searchedHeading = page.getByRole('heading', { name: 'Searched Products' });
    this.categoryHeading = page.getByRole('heading', { name: 'Category', level: 2 });
    this.brandsHeading = page.getByRole('heading', { name: 'Brands', level: 2 });

    this.searchInput = page.getByPlaceholder('Search Product');
    this.searchButton = page.locator('#submit_search');

    this.productCards = page.locator('.product-image-wrapper');

    this.addedToCartModal = page.locator('#cartModal');
    this.viewCartLink = this.addedToCartModal.getByRole('link', { name: 'View Cart' });
    this.continueShoppingButton = this.addedToCartModal.getByRole('button', {
      name: 'Continue Shopping',
    });
  }

  /** Navigate to the products page and clear any popups/overlays. */
  async goto(): Promise<void> {
    await this.page.goto('https://automationexercise.com/products', {
      waitUntil: 'domcontentloaded',
    });
    await dismissPopups(this.page);
  }

  /**
   * Search the catalogue. The search is not a form: it rewrites the URL to
   * /products?search=<term>, which the server answers with a "Searched
   * Products" grid.
   */
  async search(term: string): Promise<void> {
    await dismissPopups(this.page);
    await this.searchInput.fill(term);
    await this.searchButton.click();
    await this.page.waitForURL(
      (url) => url.pathname === '/products' && url.searchParams.get('search') === term,
      { waitUntil: 'domcontentloaded' },
    );
    await dismissPopups(this.page);
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
   *
   * The click handler comes from /static/js/cart.js, which can still be running
   * after `domcontentloaded`; a click in that window does nothing at all. Each
   * click therefore races its /add_to_cart/<id> request against the modal
   * appearing, and is repeated only when neither happened — so a slow response
   * (or a cached one that emits no request event) is never added twice.
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
    await dismissPopups(this.page);
  }

  /** The accordion panel for a top-level category. */
  categoryPanel(category: Category): Locator {
    return this.page
      .locator('.category-products .panel')
      .filter({ has: this.page.getByRole('link', { name: category }) });
  }

  /** Expand a category accordion so its items become visible. */
  async expandCategory(category: Category): Promise<void> {
    const panel = this.categoryPanel(category);
    await panel.getByRole('link', { name: category }).click();
    await panel.locator('.panel-collapse').waitFor({ state: 'visible' });
  }

  /** A sub-category link (e.g. "Tops & Shirts" under "Kids"). */
  categoryLink(category: Category, item: string): Locator {
    return this.categoryPanel(category).getByRole('link', { name: item });
  }

  /** The sidebar brand link; its accessible name includes the product count. */
  brandLink(brand: string): Locator {
    return this.page.locator('.brands-name a').filter({ hasText: brand });
  }

  /** Filter the catalogue by opening a brand's page. */
  async openBrand(brand: string): Promise<void> {
    await dismissPopups(this.page);
    await this.brandLink(brand).click();
    await this.page.waitForURL(/\/brand_products\//, { waitUntil: 'domcontentloaded' });
    await dismissPopups(this.page);
  }
}
