import { type Locator, type Page } from '@playwright/test';
import { dismissPopups } from '../helpers/dismiss-popups.helper';

/**
 * Page object for https://automationexercise.com/login
 *
 * The page contains both the "Login to your account" and the
 * "New User Signup!" forms, so both are modelled here.
 *
 * The site occasionally shows third-party overlays (e.g. a Google
 * consent dialog) and ad/promo popups. They are treated as noise:
 * the shared `dismissPopups()` helper clears them best-effort.
 */
export class LoginPage {
  readonly page: Page;

  // Page-level landmarks
  readonly loginHeading: Locator;
  readonly signupHeading: Locator;
  readonly loggedInAs: Locator;
  readonly logoutLink: Locator;

  // Login form
  readonly loginForm: Locator;
  readonly loginEmailInput: Locator;
  readonly loginPasswordInput: Locator;
  readonly loginButton: Locator;
  readonly loginErrorMessage: Locator;

  // Signup form
  readonly signupForm: Locator;
  readonly signupNameInput: Locator;
  readonly signupEmailInput: Locator;
  readonly signupButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.loginHeading = page.getByRole('heading', { name: 'Login to your account' });
    this.signupHeading = page.getByRole('heading', { name: 'New User Signup!' });
    this.loggedInAs = page.getByText(/Logged in as/);
    this.logoutLink = page.getByRole('link', { name: 'Logout' });

    // Scope each form by its heading so the duplicated "Email Address"
    // placeholder resolves to the correct input.
    this.loginForm = page
      .locator('section')
      .filter({ has: this.loginHeading });
    this.loginEmailInput = this.loginForm.getByPlaceholder('Email Address');
    this.loginPasswordInput = this.loginForm.getByPlaceholder('Password');
    this.loginButton = this.loginForm.getByRole('button', { name: 'Login' });
    this.loginErrorMessage = this.loginForm.getByText('Your email or password is incorrect!');

    this.signupForm = page
      .locator('section')
      .filter({ has: this.signupHeading });
    this.signupNameInput = this.signupForm.getByPlaceholder('Name');
    this.signupEmailInput = this.signupForm.getByPlaceholder('Email Address');
    this.signupButton = this.signupForm.getByRole('button', { name: 'Signup' });
  }

  /** Navigate to the login page and clear any popups/overlays. */
  async goto(): Promise<void> {
    await this.page.goto('https://automationexercise.com/login', {
      waitUntil: 'domcontentloaded',
    });
    await dismissPopups(this.page);
  }

  /** Submit the login form with the given credentials. */
  async login(email: string, password: string): Promise<void> {
    await dismissPopups(this.page);
    await this.loginEmailInput.fill(email);
    await this.loginPasswordInput.fill(password);
    await this.loginButton.click();
  }

  /** Submit the "New User Signup!" form. */
  async signup(name: string, email: string): Promise<void> {
    await dismissPopups(this.page);
    await this.signupNameInput.fill(name);
    await this.signupEmailInput.fill(email);
    await this.signupButton.click();
  }
}
