import { test as base, type BrowserContextOptions } from '@playwright/test';
import { BASE_URL } from '../config';
import { createUser, type GeneratedUser } from '../data/user';
import { deleteAccount, login, register } from '../utils/account-api';

/** The in-memory form of a storage state (not a file path). */
type StorageState = Exclude<BrowserContextOptions['storageState'], string | undefined>;

/** The account and browser storage state shared by every test in a worker. */
export interface AuthSession {
  account: GeneratedUser;
  /** Cookies captured after logging in; assignable to `use.storageState`. */
  storageState: StorageState;
}

/**
 * Authenticated test fixtures.
 *
 * One account is created and logged in per worker. Its cookies are exposed as
 * the worker's `storageState`, and every browser context started by tests that
 * import this `test` reuses that session. The account is deleted when the
 * worker tears down.
 */
export const test = base.extend<{ storageState: StorageState }, { auth: AuthSession }>({
  storageState: ({ auth }, use) => use(auth.storageState),

  auth: [
    async ({ playwright }, use) => {
      const request = await playwright.request.newContext({ baseURL: BASE_URL });
      const account = createUser();

      try {
        await register(request, account);
        await login(request, account);
        const storageState = await request.storageState();
        await use({ account, storageState });
      } finally {
        // Best-effort cleanup: a leaked test account must not mask a failure.
        await deleteAccount(request, account).catch(() => undefined);
        await request.dispose();
      }
    },
    { scope: 'worker' },
  ],
});
