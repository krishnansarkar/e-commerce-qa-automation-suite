import { type Locator, type Page } from '@playwright/test';
import { dismissPopups } from '../utils/dismiss-popups';

/**
 * Page object for https://automationexercise.com/account_created
 *
 * Success page shown after submitting the "Enter Account Information" form.
 * It is reachable directly by URL, but in a real flow it is reached from
 * `SignupPage.createAccount()`.
 *
 * Notes on the site's behaviour:
 * - The header still shows "Signup / Login" on this page; the logged-in nav
 *   appears only after continuing to the homepage.
 * - Google ad "vignettes" occasionally intercept the "Continue" redirect,
 *   leaving the browser on `/account_created#google_vignette` instead of `/`.
 *   `continueToHomepage()` treats that as noise and finishes the navigation.
 */
export class AccountCreatedPage {
  readonly page: Page;

  readonly heading: Locator;
  readonly confirmationMessage: Locator;
  readonly continueLink: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole('heading', { name: 'Account Created!' });
    this.confirmationMessage = page.getByText(
      'Congratulations! Your new account has been successfully created!',
    );
    this.continueLink = page.getByRole('link', { name: 'Continue' });
  }

  /** Navigate to the account-created page and clear any popups/overlays. */
  async goto(): Promise<void> {
    await this.page.goto('https://automationexercise.com/account_created', {
      waitUntil: 'domcontentloaded',
    });
    await dismissPopups(this.page);
  }

  /** Click "Continue" and land on the homepage. */
  async continueToHomepage(): Promise<void> {
    await dismissPopups(this.page);
    await this.continueLink.click();

    // Normally the click navigates to "/", but an ad vignette can pin the page
    // to "/account_created#google_vignette". Wait for either outcome.
    await this.page
      .waitForURL(
        (url) =>
          url.origin === 'https://automationexercise.com' &&
          (url.pathname === '/' || url.hash === '#google_vignette'),
        { timeout: 10_000 },
      )
      .catch(() => undefined);

    if (!/^https:\/\/automationexercise\.com\/$/.test(this.page.url())) {
      await this.page.goto('https://automationexercise.com/', {
        waitUntil: 'domcontentloaded',
      });
    }

    await dismissPopups(this.page);
  }
}
