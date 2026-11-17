import { type Locator, type Page } from '@playwright/test';

/**
 * Page object for https://automationexercise.com/login
 *
 * The page contains both the "Login to your account" and the
 * "New User Signup!" forms, so both are modelled here.
 *
 * The specs that use this page object run with the ad-blocking fixture, so the
 * site's ad and consent overlays never render here.
 */
export class LoginPage {
  readonly page: Page;

  // Page-level landmarks
  readonly loginHeading: Locator;
  readonly signupHeading: Locator;
  readonly loggedInAs: Locator;
  readonly logoutLink: Locator;

  // Login form
  readonly loginEmailInput: Locator;
  readonly loginPasswordInput: Locator;
  readonly loginButton: Locator;
  readonly loginErrorMessage: Locator;

  // Signup form
  readonly signupNameInput: Locator;
  readonly signupEmailInput: Locator;
  readonly signupButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.loginHeading = page.getByRole('heading', { name: 'Login to your account' });
    this.signupHeading = page.getByRole('heading', { name: 'New User Signup!' });
    this.loggedInAs = page.getByText(/Logged in as/);
    this.logoutLink = page.getByRole('link', { name: 'Logout' });

    // The page has two "Email Address" placeholders (login + signup), so each
    // form is scoped by its container class before resolving inputs.
    const loginForm = page.locator('.login-form');
    this.loginEmailInput = loginForm.getByPlaceholder('Email Address');
    this.loginPasswordInput = loginForm.getByPlaceholder('Password');
    this.loginButton = loginForm.getByRole('button', { name: 'Login' });
    this.loginErrorMessage = loginForm.getByText('Your email or password is incorrect!');

    const signupForm = page.locator('.signup-form');
    this.signupNameInput = signupForm.getByPlaceholder('Name');
    this.signupEmailInput = signupForm.getByPlaceholder('Email Address');
    this.signupButton = signupForm.getByRole('button', { name: 'Signup' });
  }

  /** Navigate to the login page. */
  async goto(): Promise<void> {
    await this.page.goto('https://automationexercise.com/login', {
      waitUntil: 'domcontentloaded',
    });
  }

  /** Submit the login form with the given credentials. */
  async login(email: string, password: string): Promise<void> {
    await this.loginEmailInput.fill(email);
    await this.loginPasswordInput.fill(password);
    await this.loginButton.click();
  }

  /** Submit the "New User Signup!" form. */
  async signup(name: string, email: string): Promise<void> {
    await this.signupNameInput.fill(name);
    await this.signupEmailInput.fill(email);
    await this.signupButton.click();
  }
}
