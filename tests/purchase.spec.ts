import { expect } from '@playwright/test';
import { authTest, test } from '../fixtures/fixtures';
import { BASE_URL } from '../lib/config';
import { createUser } from '../lib/data/user';
import { deleteAccount, register } from '../lib/utils/account-api';
import { AccountCreatedPage } from '../lib/pages/account-created.page';
import { HomePage } from '../lib/pages/home.page';
import { LoginPage } from '../lib/pages/login.page';
import { SignupPage } from '../lib/pages/signup.page';
import { addFeaturedProductToCart, placeOrderAndVerifyInvoice } from '../lib/utils/purchase';

// The outer describe only groups the tests; each test picks its own `test`
// object: `authTest` when it starts signed in, base `test` when it must stay a
// guest.
test.describe('Purchase e2e', () => {
  authTest('a signed-in user buys a product and downloads a matching invoice', async ({
    page,
    auth,
  }) => {
    const account = auth.account;

    // 1-2. Start on the homepage and add the first featured product; the
    //    helper checks the cart lists one unit at that card's price.
    const home = new HomePage(page);
    await home.goto();

    const { name, cart, cartTotal } = await addFeaturedProductToCart(home);

    // 3-5. Check out, pay with bogus card details and verify the invoice.
    await placeOrderAndVerifyInvoice(cart, { account, product: name, cartTotal });
  });

  test('a guest buys a product after signing in from the cart prompt', async ({ page, playwright }) => {
    const request = await playwright.request.newContext({ baseURL: BASE_URL });
    const account = createUser();

    try {
      await register(request, account);

      // 1-2. Same start as the signed-in purchase, but as a guest: the header
      //    has no logged-in links, and the product is added from the homepage.
      const home = new HomePage(page);
      await home.goto();
      await expect(home.signupLoginLink).toBeVisible();
      await expect(home.loggedInAs).toHaveCount(0);

      const { name, cart, cartTotal } = await addFeaturedProductToCart(home);

      // 3. A guest cannot check out: "Proceed To Checkout" opens the sign-in
      //    prompt instead of the checkout page.
      await cart.openGuestCheckoutPrompt();

      // 4. "Register / Login" opens the login page; sign in with the existing
      //    account, which returns to the homepage in the signed-in state.
      await cart.openLoginFromCheckoutPrompt();
      const login = new LoginPage(page);
      await expect(login.loginHeading).toBeVisible();
      await login.login(account.email, account.password);
      await expect(page).toHaveURL(/^https:\/\/automationexercise\.com\/$/);
      await expect(home.loggedInAs).toContainText(`Logged in as ${account.name}`);

      // 5. The guest cart survived sign-in, so the same product and total are
      //    still there for the account to check out.
      await home.cartLink.click();
      await expect(page).toHaveURL(/\/view_cart$/);
      await expect(cart.cartRows).toHaveCount(1);
      await expect(cart.productName(name)).toHaveText(name);
      expect(await cart.getCartTotal(name)).toBe(cartTotal);

      // 6-8. Checkout as the account, pay and verify the invoice.
      await placeOrderAndVerifyInvoice(cart, { account, product: name, cartTotal });
    } finally {
      // Best-effort cleanup: a leaked test account must not mask a failure.
      await deleteAccount(request, account).catch(() => undefined);
      await request.dispose();
    }
  });

  test('a guest buys a product after signing up from the cart prompt', async ({
    page,
    playwright,
  }) => {
    const request = await playwright.request.newContext({ baseURL: BASE_URL });
    const account = createUser();

    try {
      // 1-2. Same start as the other guest purchase: the header has no
      //    logged-in links, and the product is added from the homepage.
      const home = new HomePage(page);
      await home.goto();
      await expect(home.signupLoginLink).toBeVisible();
      await expect(home.loggedInAs).toHaveCount(0);

      const { name, cart, cartTotal } = await addFeaturedProductToCart(home);

      // 3. A guest cannot check out: "Proceed To Checkout" opens the sign-in
      //    prompt instead of the checkout page.
      await cart.openGuestCheckoutPrompt();

      // 4. "Register / Login" opens the login page; start a signup with the
      //    generated account's name and email.
      await cart.openLoginFromCheckoutPrompt();
      const login = new LoginPage(page);
      await expect(login.loginHeading).toBeVisible();
      await login.signup(account.name, account.email);

      // 5. Complete "Enter Account Information" with the same generated
      //    details, so checkout shows the addresses of the account being
      //    created.
      const signup = new SignupPage(page);
      await expect(page).toHaveURL(/\/signup$/);
      await expect(signup.accountInformationHeading).toBeVisible();
      await expect(signup.nameInput).toHaveValue(account.name);
      await expect(signup.emailInput).toHaveValue(account.email);

      await signup.fillAccountInformation({
        title: account.title,
        password: account.password,
        day: account.birth_day,
        month: account.birth_month,
        year: account.birth_year,
      });

      await signup.fillAddress({
        firstName: account.firstname,
        lastName: account.lastname,
        company: account.company,
        address: account.address1,
        address2: account.address2,
        country: account.country,
        state: account.state,
        city: account.city,
        zipcode: account.zipcode,
        mobileNumber: account.mobile_number,
      });

      await signup.createAccount();

      // 6. The account is created; "Continue" returns to the homepage in the
      //    signed-in state.
      const accountCreated = new AccountCreatedPage(page);
      await expect(page).toHaveURL(/\/account_created/);
      await expect(accountCreated.heading).toBeVisible();
      await expect(accountCreated.confirmationMessage).toBeVisible();

      await accountCreated.continueToHomepage();
      await expect(page).toHaveURL(/^https:\/\/automationexercise\.com\/$/);
      await expect(home.loggedInAs).toContainText(`Logged in as ${account.name}`);

      // 7. The guest cart survived signup, so the same product and total are
      //    still there for the new account to check out.
      await home.cartLink.click();
      await expect(page).toHaveURL(/\/view_cart$/);
      await expect(cart.cartRows).toHaveCount(1);
      await expect(cart.productName(name)).toHaveText(name);
      expect(await cart.getCartTotal(name)).toBe(cartTotal);

      // 8-10. Checkout as the new account, pay and verify the invoice.
      await placeOrderAndVerifyInvoice(cart, { account, product: name, cartTotal });
    } finally {
      // The account was created through the UI, so it only exists if signup got
      // that far; deletion is best-effort either way.
      await deleteAccount(request, account).catch(() => undefined);
      await request.dispose();
    }
  });
});
