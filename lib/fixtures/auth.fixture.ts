import {
  test as base,
  type APIRequestContext,
  type BrowserContextOptions,
} from '@playwright/test';
import { BASE_URL } from '../config';
import { createAccountForm } from '../data/account';
import { createUserCredentials, type UserCredentials } from '../data/credentials';

/** The in-memory form of a storage state (not a file path). */
type StorageState = Exclude<BrowserContextOptions['storageState'], string | undefined>;

/** The account and browser storage state shared by every test in a worker. */
export interface AuthSession {
  account: UserCredentials;
  /** Cookies captured after logging in; assignable to `use.storageState`. */
  storageState: StorageState;
}

/** Register a real account through the API. */
async function register(request: APIRequestContext, account: UserCredentials): Promise<void> {
  const response = await request.post('/api/createAccount', {
    form: createAccountForm(account),
  });
  const body = (await response.json()) as { responseCode: number; message: string };

  if (body.responseCode !== 201) {
    throw new Error(`Could not register ${account.email}: ${JSON.stringify(body)}`);
  }
}

/**
 * Log in through the site's form endpoint.
 *
 * The site is CSRF-protected and has no login API (verifyLogin is stateless),
 * so we fetch the login page, replay its token, then check that the response
 * established a session cookie.
 */
async function login(request: APIRequestContext, account: UserCredentials): Promise<void> {
  const loginPage = await request.get('/login');
  const html = await loginPage.text();
  const csrfToken = /name="csrfmiddlewaretoken" value="([^"]+)"/.exec(html)?.[1];

  if (!csrfToken) {
    throw new Error('Could not find the CSRF token on the login page.');
  }

  await request.post('/login', {
    form: {
      csrfmiddlewaretoken: csrfToken,
      email: account.email,
      password: account.password,
    },
    headers: { Referer: `${BASE_URL}/login` },
  });

  const { cookies } = await request.storageState();
  if (!cookies.some((cookie) => cookie.name === 'sessionid')) {
    throw new Error(`Login failed for ${account.email}: no session cookie was set.`);
  }
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
      const account = createUserCredentials();

      try {
        await register(request, account);
        await login(request, account);
        const storageState = await request.storageState();
        await use({ account, storageState });
      } finally {
        // Best-effort cleanup: a leaked test account must not mask a failure.
        await request
          .delete('/api/deleteAccount', {
            form: { email: account.email, password: account.password },
          })
          .catch(() => undefined);
        await request.dispose();
      }
    },
    { scope: 'worker' },
  ],
});
