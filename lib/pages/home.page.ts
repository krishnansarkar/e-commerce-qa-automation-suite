import { type Locator, type Page } from '@playwright/test';
import { ProductsNavComponent } from '../components/products-nav.component';

/**
 * Page object for https://automationexercise.com/ (homepage).
 *
 * The header is session-aware: guests see "Signup / Login", while signed-in
 * users see "Logout", "Delete Account" and a "Logged in as <name>" label.
 * Both states are modelled here so tests can assert which one is active.
 *
 * The "Features Items" grid renders the same product cards as /products, so
 * their interactions live in `ProductsNavComponent`, exposed as `productsNav`.
 */
export class HomePage {
  readonly page: Page;

  /** Product cards and the "Added!" modal, shared with the products page. */
  readonly productsNav: ProductsNavComponent;

  // Header / navigation
  readonly header: Locator;
  readonly logo: Locator;
  readonly homeLink: Locator;
  readonly productsLink: Locator;
  readonly cartLink: Locator;
  readonly signupLoginLink: Locator;
  readonly logoutLink: Locator;
  readonly deleteAccountLink: Locator;
  readonly testCasesLink: Locator;
  readonly contactUsLink: Locator;
  readonly loggedInAs: Locator;

  // Page landmarks
  readonly heroHeading: Locator;
  readonly categoryHeading: Locator;
  readonly featuresItemsHeading: Locator;
  readonly subscriptionHeading: Locator;

  constructor(page: Page) {
    this.page = page;

    this.productsNav = new ProductsNavComponent(page);

    this.header = page.getByRole('banner');
    this.logo = this.header.getByRole('img');
    this.homeLink = this.header.getByRole('link', { name: 'Home' });
    this.productsLink = this.header.getByRole('link', { name: 'Products' });
    this.cartLink = this.header.getByRole('link', { name: 'Cart' });
    this.signupLoginLink = this.header.getByRole('link', { name: 'Signup / Login' });
    this.logoutLink = this.header.getByRole('link', { name: 'Logout' });
    this.deleteAccountLink = this.header.getByRole('link', { name: 'Delete Account' });
    this.testCasesLink = this.header.getByRole('link', { name: 'Test Cases' });
    this.contactUsLink = this.header.getByRole('link', { name: 'Contact us' });
    this.loggedInAs = this.header.getByText(/Logged in as/);

    // The hero carousel duplicates its slides, so only the first is modelled.
    this.heroHeading = page
      .getByRole('heading', { name: 'AutomationExercise', level: 1 })
      .first();
    this.categoryHeading = page.getByRole('heading', { name: 'Category', level: 2 });
    this.featuresItemsHeading = page.getByRole('heading', { name: 'Features Items', level: 2 });
    this.subscriptionHeading = page.getByRole('heading', { name: 'Subscription', level: 2 });
  }

  /** Navigate to the homepage. */
  async goto(): Promise<void> {
    await this.page.goto('https://automationexercise.com/', {
      waitUntil: 'domcontentloaded',
    });
  }

  /** Open the login page via the header's "Signup / Login" link. */
  async openLogin(): Promise<void> {
    await this.signupLoginLink.click();
    await this.page.waitForURL(/\/login$/);
  }

  /** True when the header shows the signed-in account links. */
  async isLoggedIn(): Promise<boolean> {
    return this.loggedInAs.isVisible().catch(() => false);
  }

  /** The account name shown in the header, or an empty string when signed out. */
  async loggedInUser(): Promise<string> {
    if (!(await this.isLoggedIn())) {
      return '';
    }
    const text = await this.loggedInAs.textContent();
    return text?.replace(/^.*Logged in as\s*/, '').trim() ?? '';
  }

  /** Sign out via the header link. */
  async logout(): Promise<void> {
    await this.logoutLink.click();
    await this.page.waitForURL(/\/login$/);
  }
}
