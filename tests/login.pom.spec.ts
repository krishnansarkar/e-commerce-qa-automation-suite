import { test, expect } from '@playwright/test';
import { LoginPage } from '../lib/pages/login.page';

test.describe('LoginPage POM', () => {
  test('every locator resolves to exactly one element', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();

    await expect(login.loginHeading).toBeVisible();
    await expect(login.signupHeading).toBeVisible();

    for (const locator of [
      login.loginEmailInput,
      login.loginPasswordInput,
      login.loginButton,
      login.signupNameInput,
      login.signupEmailInput,
      login.signupButton,
    ]) {
      await expect(locator).toHaveCount(1);
      await expect(locator).toBeVisible();
    }

    // Logged-out state: the session landmarks must not be present.
    await expect(login.loggedInAs).toHaveCount(0);
    await expect(login.logoutLink).toHaveCount(0);
  });

  test('login() submits the login form and surfaces the error', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();

    await login.login('nobody@example.com', 'wrong-password');

    await expect(login.loginErrorMessage).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('signup() submits the signup form', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();

    const name = 'POM Verifier';
    const email = `pom.verify.${Date.now()}@example.com`;
    await login.signup(name, email);

    await expect(page).toHaveURL(/\/signup$/);
    await expect(page.locator('[data-qa="name"]')).toHaveValue(name);
    await expect(page.locator('[data-qa="email"]')).toHaveValue(email);
  });
});
