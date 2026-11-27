import { type Locator, type Page } from '@playwright/test';
import { ProductsNavComponent } from '../components/products-nav.component';

/** Sidebar category accordions, expanded on demand. */
export type Category = 'Women' | 'Men' | 'Kids';

/**
 * Page object for https://automationexercise.com/products
 *
 * The "All Products" listing: a search bar, a sidebar with collapsible
 * categories and brands, and a grid of product cards. The cards (and the
 * "Added!" modal they trigger) are the same markup the homepage renders, so
 * they live in `ProductsNavComponent`, exposed here as `productsNav`.
 *
 * Notes on the site's markup:
 * - All products are rendered on one page; there is no pagination.
 * - Category links are Bootstrap collapse toggles: the items are in the DOM but
 *   hidden until the category is expanded.
 * - Brand links carry the product count in their accessible name (e.g. "(6)Polo"),
 *   so they are matched by text rather than by role name.
 * - The `load` event can stall on ads, so navigations wait for `domcontentloaded`.
 */
export class ProductsPage {
  readonly page: Page;

  /** Product cards and the "Added!" modal, shared with the homepage. */
  readonly productsNav: ProductsNavComponent;

  // Page-level landmarks
  readonly heading: Locator;
  readonly searchedHeading: Locator;
  readonly categoryHeading: Locator;
  readonly brandsHeading: Locator;

  // Search
  readonly searchInput: Locator;
  readonly searchButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.productsNav = new ProductsNavComponent(page);

    this.heading = page.getByRole('heading', { name: 'All Products' });
    this.searchedHeading = page.getByRole('heading', { name: 'Searched Products' });
    this.categoryHeading = page.getByRole('heading', { name: 'Category', level: 2 });
    this.brandsHeading = page.getByRole('heading', { name: 'Brands', level: 2 });

    this.searchInput = page.getByPlaceholder('Search Product');
    this.searchButton = page.locator('#submit_search');
  }

  /** Navigate to the products page. */
  async goto(): Promise<void> {
    await this.page.goto('https://automationexercise.com/products', {
      waitUntil: 'domcontentloaded',
    });
  }

  /** Extract the name shown on the card at a zero-based position. */
  async getProductName(index: number): Promise<string> {
    return this.productsNav.getProductName(index);
  }

  /** Extract the price shown on the card at a zero-based position as a number. */
  async getProductPrice(index: number): Promise<number> {
    return this.productsNav.getProductPrice(index);
  }

  /**
   * Search the catalogue. The search is not a form: it rewrites the URL to
   * /products?search=<term>, which the server answers with a "Searched
   * Products" grid.
   */
  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await this.searchButton.click();
    await this.page.waitForURL(
      (url) => url.pathname === '/products' && url.searchParams.get('search') === term,
      { waitUntil: 'domcontentloaded' },
    );
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
    await this.brandLink(brand).click();
    await this.page.waitForURL(/\/brand_products\//, { waitUntil: 'domcontentloaded' });
  }
}
