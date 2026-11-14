import { expect } from '@playwright/test';
import { test } from '../lib/fixtures/auth.fixture';
import { HomePage } from '../lib/pages/home.page';

test.describe('Authenticated worker fixture', () => {
  test('exposes a live account and signs the browser context in', async ({
    auth,
    page,
    request,
  }) => {
    // The fixture's account really exists and the credentials are valid.
    const verify = await request.post('/api/verifyLogin', {
      form: { email: auth.account.email, password: auth.account.password },
    });
    expect(await verify.json()).toEqual({
      responseCode: 200,
      message: 'User exists!',
    });

    // The worker's storage state carries the login session.
    expect(auth.storageState.cookies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'sessionid',
          domain: expect.stringMatching(/automationexercise\.com$/),
        }),
      ]),
    );

    // The page fixture reuses the storage state, so the header is signed in.
    const home = new HomePage(page);
    await home.goto();
    await expect(home.loggedInAs).toContainText(`Logged in as ${auth.account.name}`);
  });
});
