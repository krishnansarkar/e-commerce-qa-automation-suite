import { expect } from '@playwright/test';
import { test } from '../fixtures/fixtures';
import { BASE_URL } from '../lib/config';
import { createUser } from '../lib/data/user';
import { deleteAccount, register } from '../lib/utils/account-api';
import { HomePage } from '../lib/pages/home.page';
import { LoginPage } from '../lib/pages/login.page';

/**
 * Login e2e.
 *
 * These tests exercise the login form itself, so every test starts from a
 * logged-out context. The valid-credentials test registers a real account
 * through the auth API and removes it again in `finally`, which keeps the
 * fixture-provided session (and its login) out of the way. Ads are blocked so
 * the site's overlays cannot cover the form.
 */
test.describe('Login e2e', () => {
  test('a registered user can log in with valid credentials', async ({ page, playwright }) => {
    const request = await playwright.request.newContext({ baseURL: BASE_URL });
    const account = createUser();

    try {
      await register(request, account);

      // 1. A guest lands on the homepage with the signed-out header.
      const home = new HomePage(page);
      await home.goto();
      await expect(home.signupLoginLink).toBeVisible();
      await expect(home.loggedInAs).toHaveCount(0);
      expect(await home.isLoggedIn()).toBe(false);

      // 2. "Signup / Login" opens the login page and its heading is shown.
      await home.signupLoginLink.click();
      const login = new LoginPage(page);
      await expect(page).toHaveURL(/\/login$/);
      await expect(login.loginHeading).toBeVisible();
      await expect(login.loggedInAs).toHaveCount(0);

      // 3. Sign in with the account registered for this test.
      await login.login(account.email, account.password);

      // 4. The site returns to the homepage with the signed-in header.
      await expect(page).toHaveURL(/^https:\/\/automationexercise\.com\/$/);
      await expect(home.loggedInAs).toContainText(`Logged in as ${account.name}`);
      await expect(home.logoutLink).toBeVisible();
      await expect(home.signupLoginLink).toHaveCount(0);
      expect(await home.loggedInUser()).toBe(account.name);

      // 5. The session survives a full page reload. `load` can stall on ads, so
      //    wait for `domcontentloaded` and allow the header time to render.
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(home.loggedInAs).toContainText(`Logged in as ${account.name}`, {
        timeout: 15_000,
      });
    } finally {
      // Best-effort cleanup: a leaked test account must not mask a failure.
      await deleteAccount(request, account).catch(() => undefined);
      await request.dispose();
    }
  });

  test('a wrong password is rejected and the user stays signed out', async ({ page }) => {
    const account = createUser();
    const login = new LoginPage(page);
    await login.goto();
    await expect(login.loginHeading).toBeVisible();

    await login.login(account.email, `${account.password}-wrong`);

    await expect(login.loginErrorMessage).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    await expect(login.loggedInAs).toHaveCount(0);
  });
});
