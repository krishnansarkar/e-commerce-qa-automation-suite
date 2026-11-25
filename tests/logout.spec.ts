import { expect } from '@playwright/test';
import { test } from '../fixtures/fixtures';
import { BASE_URL } from '../lib/config';
import { createUser } from '../lib/data/user';
import { deleteAccount, login, register } from '../lib/utils/account-api';
import { HomePage } from '../lib/pages/home.page';
import { LoginPage } from '../lib/pages/login.page';

/**
 * Logout e2e.
 *
 * Logging out ends the account's session server-side, so this spec must not use
 * the worker-scoped auth fixture: every later test in the same worker would
 * then run signed out (this made purchase.spec.ts flaky). Instead the test
 * registers a throwaway account, signs in through the auth API and copies that
 * session into the browser context. The account is deleted in `finally`. Ads
 * are blocked so the site's overlays cannot cover the header.
 */
test.describe('Logout e2e', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('a signed-in user can log out', async ({ page, context, playwright }) => {
    const request = await playwright.request.newContext({ baseURL: BASE_URL });
    const account = createUser();

    try {
      await register(request, account);
      await login(request, account);
      const { cookies } = await request.storageState();
      await context.addCookies(cookies);

      // 1. The API session signs this context in, so the homepage opens with
      //    the signed-in header.
      const home = new HomePage(page);
      await home.goto();
      await expect(home.loggedInAs).toContainText(`Logged in as ${account.name}`);
      await expect(home.logoutLink).toBeVisible();
      await expect(home.signupLoginLink).toHaveCount(0);
      expect(await home.isLoggedIn()).toBe(true);

      // 2. "Logout" ends the session and returns the user to the login page.
      await home.logout();
      await expect(page).toHaveURL(/\/login$/);
      const loginPage = new LoginPage(page);
      await expect(loginPage.loginHeading).toBeVisible();
      await expect(loginPage.loggedInAs).toHaveCount(0);

      // 3. The session is really gone: the homepage now shows the guest header.
      await home.goto();
      await expect(home.signupLoginLink).toBeVisible();
      await expect(home.logoutLink).toHaveCount(0);
      await expect(home.loggedInAs).toHaveCount(0);
      expect(await home.isLoggedIn()).toBe(false);
    } finally {
      // Best-effort cleanup: a leaked test account must not mask a failure.
      await deleteAccount(request, account).catch(() => undefined);
      await request.dispose();
    }
  });
});
