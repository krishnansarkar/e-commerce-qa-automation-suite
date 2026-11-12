import { test, expect } from '@playwright/test';
import { AccountCreatedPage } from '../lib/pages/account-created.page';

test.describe('AccountCreatedPage POM', () => {
  test('goto() shows the account-created confirmation', async ({ page }) => {
    const accountCreated = new AccountCreatedPage(page);
    await accountCreated.goto();

    await expect(page).toHaveURL(/\/account_created$/);
    await expect(accountCreated.heading).toBeVisible();
    await expect(accountCreated.confirmationMessage).toBeVisible();

    for (const locator of [
      accountCreated.heading,
      accountCreated.confirmationMessage,
      accountCreated.continueLink,
    ]) {
      await expect(locator).toHaveCount(1);
      await expect(locator).toBeVisible();
    }
  });

  test('continueToHomepage() lands on the homepage', async ({ page }) => {
    const accountCreated = new AccountCreatedPage(page);
    await accountCreated.goto();

    await accountCreated.continueToHomepage();

    await expect(page).toHaveURL(/^https:\/\/automationexercise\.com\/$/);
  });
});
