import { type Locator, type Page } from '@playwright/test';

/** How long a cart click may take to register before it is retried. */
const CLICK_SETTLE_MS = 5_000;

/** Review details accepted by the "Write Your Review" form. */
export interface ProductReview {
  name: string;
  email: string;
  review: string;
}

/**
 * Page object for https://automationexercise.com/product_details/<id>
 *
 * A single product: an image, name, category, price and stock details, a
 * quantity input with an "Add to cart" button, and a "Write Your Review" form.
 * Reached directly by URL or from a product card via
 * `ProductsNavComponent.viewProduct()`.
 *
 * Notes on the site's markup:
 * - The page has no `data-qa` attributes; the stable handles are the
 *   `.product-information` container and the review form's ids.
 * - The price is a bare `<span><span>Rs. 679</span>…</span>` with no label, so
 *   it is matched by its `Rs. …` text.
 * - The ad script injects a "Browse Clothing" link into the category
 *   paragraph, so the category is matched by its "Category:" prefix rather
 *   than its full text.
 * - "Add to cart" is a `<button class="btn btn-default cart">` whose handler
 *   comes from /static/js/cart.js. The handler reads `#quantity` and the hidden
 *   `#product_id` and POSTs to /add_to_cart/<id>; the same cart.js race as on
 *   the listing pages applies, so the click is retried when nothing happened.
 * - On success the shared "Added!" modal (`#cartModal`) appears, with a "View
 *   Cart" link and a "Continue Shopping" button.
 * - The review form is handled entirely client-side: submitting reveals
 *   "Thank you for your review." for ~2 seconds and clears the fields. Nothing
 *   is sent to the server, so it can be exercised safely.
 */
export class ProductDetailsPage {
  readonly page: Page;

  // Product information
  readonly productInformation: Locator;
  readonly nameHeading: Locator;
  readonly category: Locator;
  readonly price: Locator;
  readonly availability: Locator;
  readonly condition: Locator;
  readonly brand: Locator;
  readonly quantityInput: Locator;
  readonly addToCartButton: Locator;

  // "Added!" modal
  readonly addedToCartModal: Locator;
  readonly viewCartLink: Locator;
  readonly continueShoppingButton: Locator;

  // Reviews
  readonly writeReviewLink: Locator;
  readonly reviewForm: Locator;
  readonly reviewNameInput: Locator;
  readonly reviewEmailInput: Locator;
  readonly reviewTextarea: Locator;
  readonly reviewSubmitButton: Locator;
  readonly reviewSuccessMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    this.productInformation = page.locator('.product-information');
    this.nameHeading = this.productInformation.getByRole('heading', { level: 2 });
    this.category = this.productInformation.locator('p').filter({ hasText: 'Category:' });
    this.price = this.productInformation.getByText(/^Rs\.\s*[\d,.]+$/);
    this.availability = this.productInformation.locator('p').filter({ hasText: 'Availability:' });
    this.condition = this.productInformation.locator('p').filter({ hasText: 'Condition:' });
    this.brand = this.productInformation.locator('p').filter({ hasText: 'Brand:' });
    this.quantityInput = this.productInformation.getByRole('spinbutton');
    this.addToCartButton = this.productInformation.getByRole('button', { name: 'Add to cart' });

    this.addedToCartModal = page.locator('#cartModal');
    this.viewCartLink = this.addedToCartModal.getByRole('link', { name: 'View Cart' });
    this.continueShoppingButton = this.addedToCartModal.getByRole('button', {
      name: 'Continue Shopping',
    });

    this.writeReviewLink = page.getByRole('link', { name: 'Write Your Review' });
    this.reviewForm = page.locator('#review-form');
    this.reviewNameInput = this.reviewForm.getByPlaceholder('Your Name');
    this.reviewEmailInput = this.reviewForm.getByPlaceholder('Email Address');
    this.reviewTextarea = this.reviewForm.getByPlaceholder('Add Review Here!');
    this.reviewSubmitButton = this.reviewForm.getByRole('button', { name: 'Submit' });
    this.reviewSuccessMessage = this.reviewForm.locator('#review-section .alert-success');
  }

  /** Navigate to a product's details page by id. */
  async goto(productId: number): Promise<void> {
    await this.page.goto(`https://automationexercise.com/product_details/${productId}`, {
      waitUntil: 'domcontentloaded',
    });
  }

  /** The product id taken from the current /product_details/<id> URL. */
  productId(): number {
    const match = /\/product_details\/(\d+)/.exec(this.page.url());
    if (!match) {
      throw new Error(`Not on a product details page: ${this.page.url()}`);
    }
    return Number(match[1]);
  }

  /** Set the quantity that "Add to cart" will request. */
  async setQuantity(quantity: number): Promise<void> {
    await this.quantityInput.fill(String(quantity));
  }

  /**
   * Add this product to the cart and wait for the "Added!" modal.
   *
   * The click handler comes from cart.js, which can still be running after
   * `domcontentloaded`; a click in that window does nothing at all. Each click
   * therefore races its /add_to_cart/<id> request against the modal appearing
   * and is repeated only when neither happened.
   */
  async addToCart(quantity?: number): Promise<void> {
    if (quantity !== undefined) {
      await this.setQuantity(quantity);
    }

    // The modal covers the page, so it must be dismissed before clicking.
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

      await this.addToCartButton.click();

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

  /** Fill and submit the "Write Your Review" form. */
  async submitReview(review: ProductReview): Promise<void> {
    await this.reviewNameInput.fill(review.name);
    await this.reviewEmailInput.fill(review.email);
    await this.reviewTextarea.fill(review.review);
    await this.reviewSubmitButton.click();
    await this.reviewSuccessMessage.waitFor({ state: 'visible' });
  }
}
