import { test, expect } from '@playwright/test';
import { createAccountForm } from '../../lib/data/account';
import { createUserCredentials } from '../../lib/data/credentials';

/**
 * Register API: POST /api/createAccount
 *
 * The site always answers with HTTP 200; the outcome is reported in the JSON
 * body via `responseCode` (201 on success). Accounts are real, so the test
 * deletes the one it creates.
 */
test.describe('Register API', () => {
  test('creates a new user account', async ({ request }) => {
    const account = createUserCredentials();
    const { email, password } = account;

    try {
      const response = await request.post('/api/createAccount', {
        form: createAccountForm(account),
      });

      expect(response.status()).toBe(200);
      expect(await response.json()).toEqual({
        responseCode: 201,
        message: 'User created!',
      });
    } finally {
      // Best-effort cleanup so repeated runs do not accumulate accounts.
      await request
        .delete('/api/deleteAccount', { form: { email, password } })
        .catch(() => undefined);
    }
  });
});
