import { expect } from '@playwright/test';
import { test } from '../lib/fixtures/adblock.fixture';
import { createUserCredentials } from '../lib/data/credentials';
import { LoginPage } from '../lib/pages/login.page';
import { SignupPage } from '../lib/pages/signup.page';
import { AccountCreatedPage } from '../lib/pages/account-created.page';
import { HomePage } from '../lib/pages/home.page';

test.describe('Signup e2e', () => {
  test('a new user can create an account and is logged in on the homepage', async ({ page }) => {
    const { name, email, password } = createUserCredentials();

    // 1. Start as a guest on the homepage and open the login page from the header.
    const home = new HomePage(page);
    await home.goto();
    await expect(home.signupLoginLink).toBeVisible();
    await home.openLogin();

    // 2. Submit the "New User Signup!" form.
    const login = new LoginPage(page);
    await expect(login.signupHeading).toBeVisible();
    await login.signup(name, email);

    // 3. Complete the "Enter Account Information" form with bogus details.
    const signup = new SignupPage(page);
    await expect(page).toHaveURL(/\/signup$/);
    await expect(signup.accountInformationHeading).toBeVisible();
    await expect(signup.nameInput).toHaveValue(name);
    await expect(signup.emailInput).toHaveValue(email);

    await signup.fillAccountInformation({
      title: 'Mrs.',
      password,
      day: '15',
      month: 'January',
      year: '1990',
      newsletter: true,
      specialOffers: true,
    });

    await signup.fillAddress({
      firstName: 'Bogus',
      lastName: 'Tester',
      company: 'Bogus Co',
      address: '1 Fake Street',
      address2: 'Suite 404',
      country: 'United States',
      state: 'California',
      city: 'Nowhere',
      zipcode: '90210',
      mobileNumber: '555-0100',
    });

    await signup.createAccount();

    // 4. The account is created and the confirmation page is shown.
    const accountCreated = new AccountCreatedPage(page);
    await expect(page).toHaveURL(/\/account_created/);
    await expect(accountCreated.heading).toBeVisible();
    await expect(accountCreated.confirmationMessage).toBeVisible();

    // 5. Continue to the homepage, where the header reflects the new session.
    await accountCreated.continueToHomepage();

    await expect(page).toHaveURL(/^https:\/\/automationexercise\.com\/$/);
    await expect(home.loggedInAs).toBeVisible();
    await expect(home.loggedInAs).toContainText(`Logged in as ${name}`);
    await expect(home.logoutLink).toBeVisible();
    await expect(home.deleteAccountLink).toBeVisible();
    await expect(home.signupLoginLink).toHaveCount(0);

    // 6. The nav bar identifies the newly created account.
    expect(await home.isLoggedIn()).toBe(true);
    expect(await home.loggedInUser()).toBe(name);
  });
});
