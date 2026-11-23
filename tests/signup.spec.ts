import { expect } from '@playwright/test';
import { test } from '../lib/fixtures/adblock.fixture';
import { BASE_URL } from '../lib/config';
import { createUser } from '../lib/data/user';
import { deleteAccount, register } from '../lib/utils/auth-api';
import { LoginPage } from '../lib/pages/login.page';
import { SignupPage } from '../lib/pages/signup.page';
import { AccountCreatedPage } from '../lib/pages/account-created.page';
import { HomePage } from '../lib/pages/home.page';

test.describe('Signup e2e', () => {
  test('a new user can create an account and is logged in on the homepage', async ({ page }) => {
    const userInfo = createUser();
    const { name, email, password } = userInfo;

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
      title: userInfo.title,
      password,
      day: userInfo.birth_day,
      month: userInfo.birth_month,
      year: userInfo.birth_year,
      newsletter: true,
      specialOffers: true,
    });

    await signup.fillAddress({
      firstName: userInfo.firstname,
      lastName: userInfo.lastname,
      company: userInfo.company,
      address: userInfo.address1,
      address2: userInfo.address2,
      country: userInfo.country,
      state: userInfo.state,
      city: userInfo.city,
      zipcode: userInfo.zipcode,
      mobileNumber: userInfo.mobile_number,
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

  test('a duplicate email is rejected at the signup form', async ({ page, playwright }) => {
    const request = await playwright.request.newContext({ baseURL: BASE_URL });
    const account = createUser();

    try {
      // Register the email first so the signup form has something to collide with.
      await register(request, account);

      // 1. Open the login page and submit the "New User Signup!" form with the
      //    already-registered email.
      const login = new LoginPage(page);
      await login.goto();
      await expect(login.signupHeading).toBeVisible();
      await login.signup(account.name, account.email);

      // 2. The site re-renders the signup/login page (never the account-info
      //    page) and reports that the email is taken.
      await expect(page).toHaveURL(/\/signup$/);
      await expect(login.signupErrorMessage).toBeVisible();
      await expect(login.signupHeading).toBeVisible();
    } finally {
      // Best-effort cleanup so a leaked account does not mask a failure.
      await deleteAccount(request, account).catch(() => undefined);
      await request.dispose();
    }
  });
});
