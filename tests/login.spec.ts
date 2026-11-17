import { expect, mergeTests } from '@playwright/test';
import { test as authTest } from '../lib/fixtures/auth.fixture';
import { test as adBlockTest } from '../lib/fixtures/adblock.fixture';
import { HomePage } from '../lib/pages/home.page';
import { LoginPage } from '../lib/pages/login.page';

/**
 * Login e2e.
 *
 * The auth fixture registers a real account per worker and signs the worker's
 * browser context in. These tests exercise the login form itself, so every test
 * starts from a logged-out context while still reusing the fixture's account.
 * Ads are blocked so the site's overlays cannot cover the form.
 */
const test = mergeTests(authTest, adBlockTest);

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Login e2e', () => {
  test('a registered user can log in with valid credentials', async ({ page, auth }) => {
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

    // 3. Sign in with the fixture's real credentials.
    await login.login(auth.account.email, auth.account.password);

    // 4. The site returns to the homepage with the signed-in header.
    await expect(page).toHaveURL(/^https:\/\/automationexercise\.com\/$/);
    await expect(home.loggedInAs).toContainText(`Logged in as ${auth.account.name}`);
    await expect(home.logoutLink).toBeVisible();
    await expect(home.signupLoginLink).toHaveCount(0);
    expect(await home.loggedInUser()).toBe(auth.account.name);

    // 5. The session survives a full page reload. `load` can stall on ads, so
    //    wait for `domcontentloaded` and allow the header time to render.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(home.loggedInAs).toContainText(`Logged in as ${auth.account.name}`, {
      timeout: 15_000,
    });
  });

  test('a wrong password is rejected and the user stays signed out', async ({ page, auth }) => {
    const login = new LoginPage(page);
    await login.goto();
    await expect(login.loginHeading).toBeVisible();

    await login.login(auth.account.email, `${auth.account.password}-wrong`);

    await expect(login.loginErrorMessage).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    await expect(login.loggedInAs).toHaveCount(0);
  });
});
