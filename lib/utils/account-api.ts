import { type APIRequestContext, type APIResponse } from '@playwright/test';
import { BASE_URL } from '../config';
import type { GeneratedUser, UserCredentials } from '../data/user';

/** Register a real account through the API. */
export async function register(
  request: APIRequestContext,
  account: GeneratedUser,
): Promise<APIResponse> {
  return request.post('/api/createAccount', {
    form: account,
  });
}

/**
 * Log in through the site's form endpoint.
 *
 * The site has no session-based login API (`verifyLogin` is stateless), so we
 * fetch the login page and replay its token to establish a session.
 */
export async function login(
  request: APIRequestContext,
  account: UserCredentials,
): Promise<APIResponse> {
  const loginPage = await request.get('/login');
  const html = await loginPage.text();
  const csrfToken = /name="csrfmiddlewaretoken" value="([^"]+)"/.exec(html)?.[1] ?? '';

  return request.post('/login', {
    form: {
      csrfmiddlewaretoken: csrfToken,
      email: account.email,
      password: account.password,
    },
    headers: { Referer: `${BASE_URL}/login` },
  });
}

/**
 * Verify credentials with the stateless POST /api/verifyLogin endpoint.
 *
 * This only checks the credentials; it does not establish a session. Use
 * `login()` when the request context needs to stay signed in.
 */
export async function verifyLogin(
  request: APIRequestContext,
  account: UserCredentials,
): Promise<APIResponse> {
  return request.post('/api/verifyLogin', {
    form: { email: account.email, password: account.password },
  });
}

/** Delete an account through the API. */
export async function deleteAccount(
  request: APIRequestContext,
  account: UserCredentials,
): Promise<APIResponse> {
  return request.delete('/api/deleteAccount', {
    form: { email: account.email, password: account.password },
  });
}
