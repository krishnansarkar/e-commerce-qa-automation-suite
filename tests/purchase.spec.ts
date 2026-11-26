import { expect } from '@playwright/test';
import { authTest, test } from '../fixtures/fixtures';
import { BASE_URL } from '../lib/config';
import { createUser } from '../lib/data/user';
import { deleteAccount, register } from '../lib/utils/account-api';
import { HomePage } from '../lib/pages/home.page';
import { LoginPage } from '../lib/pages/login.page';
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
});
