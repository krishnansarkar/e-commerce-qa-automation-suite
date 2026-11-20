import { type APIRequestContext } from '@playwright/test';
import { BASE_URL } from '../config';
import type { GeneratedUser, UserCredentials } from '../data/user';

/** Register a real account through the API. */
export async function register(request: APIRequestContext, account: GeneratedUser): Promise<void> {
  const response = await request.post('/api/createAccount', {
    form: account,
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
export async function login(request: APIRequestContext, account: UserCredentials): Promise<void> {
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

/** Delete an account through the API. */
export async function deleteAccount(
  request: APIRequestContext,
  account: UserCredentials,
): Promise<void> {
  await request.delete('/api/deleteAccount', {
    form: { email: account.email, password: account.password },
  });
}
