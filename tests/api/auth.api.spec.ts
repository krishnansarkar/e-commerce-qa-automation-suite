import { test, expect } from '@playwright/test';
import { createUser } from '../../lib/data/user';
import { deleteAccount, login, register, verifyLogin } from '../../lib/utils/account-api';

/**
 * Auth API: register, login and delete.
 *
 * The site always answers with HTTP 200; create/delete report the outcome in
 * the JSON body via `responseCode` (201 on creation, 200 on deletion). Login
 * is the CSRF-protected form endpoint, so a signed-in request context is the
 * proof that it worked. Accounts are real, so each test removes the one it
 * creates.
 */
test.describe('Auth API', () => {
  test('creates a new user account', async ({ request }) => {
    const account = createUser();

    try {
      const response = await register(request, account);

      expect(response.status()).toBe(200);
      expect(await response.json()).toEqual({
        responseCode: 201,
        message: 'User created!',
      });
    } finally {
      // Best-effort cleanup so repeated runs do not accumulate accounts.
      await deleteAccount(request, account).catch(() => undefined);
    }
  });

  test('verifies login with valid details', async ({ request }) => {
    const account = createUser();

    try {
      await register(request, account);

      const response = await verifyLogin(request, account);

      expect(response.status()).toBe(200);
      expect(await response.json()).toEqual({
        responseCode: 200,
        message: 'User exists!',
      });
    } finally {
      await deleteAccount(request, account).catch(() => undefined);
    }
  });

  test('verifies login with invalid details', async ({ request }) => {
    // A generated account is never registered, so its credentials cannot match.
    const account = createUser();

    const response = await verifyLogin(request, account);

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({
      responseCode: 404,
      message: 'User not found!',
    });
  });

  test('deletes an existing user account', async ({ request }) => {
    const account = createUser();

    try {
      await register(request, account);

      const response = await deleteAccount(request, account);

      expect(response.status()).toBe(200);
      expect(await response.json()).toEqual({
        responseCode: 200,
        message: 'Account deleted!',
      });
    } finally {
      // Deleting again is harmless and cleans up if an assertion failed early.
      await deleteAccount(request, account).catch(() => undefined);
    }
  });
});
