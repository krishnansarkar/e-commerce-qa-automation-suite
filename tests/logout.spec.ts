import { expect, mergeTests } from '@playwright/test';
import { test as authTest } from '../lib/fixtures/auth.fixture';
import { test as adBlockTest } from '../lib/fixtures/adblock.fixture';
import { HomePage } from '../lib/pages/home.page';
import { LoginPage } from '../lib/pages/login.page';

/**
 * Logout e2e.
 *
 * The auth fixture registers a real account per worker and signs the worker's
 * browser context in, so the test starts from a signed-in homepage. Logging out
 * invalidates that worker's session, so this flow lives in its own spec rather
 * than sharing a file with tests that need the fixture's session. Ads are
 * blocked so the site's overlays cannot cover the header.
 */
const test = mergeTests(authTest, adBlockTest);

test.describe('Logout e2e', () => {
  test('a signed-in user can log out', async ({ page, auth }) => {
    // 1. The auth fixture's storage state signs this context in, so the
    //    homepage opens with the signed-in header.
    const home = new HomePage(page);
    await home.goto();
    await expect(home.loggedInAs).toContainText(`Logged in as ${auth.account.name}`);
    await expect(home.logoutLink).toBeVisible();
    await expect(home.signupLoginLink).toHaveCount(0);
    expect(await home.isLoggedIn()).toBe(true);

    // 2. "Logout" ends the session and returns the user to the login page.
    await home.logout();
    await expect(page).toHaveURL(/\/login$/);
    const login = new LoginPage(page);
    await expect(login.loginHeading).toBeVisible();
    await expect(login.loggedInAs).toHaveCount(0);

    // 3. The session is really gone: the homepage now shows the guest header.
    await home.goto();
    await expect(home.signupLoginLink).toBeVisible();
    await expect(home.logoutLink).toHaveCount(0);
    await expect(home.loggedInAs).toHaveCount(0);
    expect(await home.isLoggedIn()).toBe(false);
  });
});
