import { test, expect } from '@playwright/test';
import { HomePage } from '../lib/pages/home.page';

test.describe('HomePage POM', () => {
  test('every locator resolves to exactly one element', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await expect(page).toHaveURL(/^https:\/\/automationexercise\.com\/$/);
    await expect(home.heroHeading).toBeVisible();
    await expect(home.categoryHeading).toBeVisible();
    await expect(home.featuresItemsHeading).toBeVisible();
    await expect(home.subscriptionHeading).toBeVisible();

    for (const locator of [
      home.logo,
      home.homeLink,
      home.productsLink,
      home.cartLink,
      home.testCasesLink,
      home.contactUsLink,
      home.heroHeading,
      home.categoryHeading,
      home.featuresItemsHeading,
      home.subscriptionHeading,
    ]) {
      await expect(locator).toHaveCount(1);
      await expect(locator).toBeVisible();
    }
  });

  test('a guest sees the sign-up link instead of the account links', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await expect(home.signupLoginLink).toBeVisible();
    await expect(home.loggedInAs).toHaveCount(0);
    await expect(home.logoutLink).toHaveCount(0);
    await expect(home.deleteAccountLink).toHaveCount(0);
    expect(await home.isLoggedIn()).toBe(false);
    expect(await home.loggedInUser()).toBe('');
  });
});
