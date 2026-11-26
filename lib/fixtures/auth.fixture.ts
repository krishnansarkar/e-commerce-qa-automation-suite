import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { test as base, type BrowserContextOptions } from '@playwright/test';
import { BASE_URL } from '../config';
import { createUser, type GeneratedUser } from '../data/user';
import { deleteAccount, login, register } from '../utils/account-api';

/** Where each worker's captured session is written (gitignored). */
const AUTH_DIR = path.resolve(__dirname, '../../playwright/.auth');

/** Everything `storageState` accepts except `undefined`: a path or in-memory state. */
type StorageStateOption = Exclude<BrowserContextOptions['storageState'], undefined>;

/** The account backing a worker's signed-in session. */
export interface AuthSession {
  account: GeneratedUser;
  /** JSON file holding the cookies captured after logging in. */
  storageStatePath: string;
}

/**
 * Authenticated test fixtures, split by scope.
 *
 * Worker scope (`auth`): creates one account, logs it in through the API, and
 * writes the resulting cookies to `playwright/.auth/worker-<n>.json`. The
 * account is deleted and the file removed when the worker tears down.
 *
 * Test scope (`storageState`): applies that file to each test's browser
 * context, so every test importing this `test` starts signed in as the
 * worker's account without repeating the login cost.
 *
 * Keeping the two apart means the expensive setup runs once per worker while
 * each test only reads the session that setup prepared.
 */
export const test = base.extend<{ storageState: StorageStateOption }, { auth: AuthSession }>({
  storageState: async ({ auth }, use) => {
    await use(auth.storageStatePath);
  },

  auth: [
    async ({ playwright }, use, workerInfo) => {
      const storageStatePath = path.join(AUTH_DIR, `worker-${workerInfo.workerIndex}.json`);
      await mkdir(AUTH_DIR, { recursive: true });

      const request = await playwright.request.newContext({ baseURL: BASE_URL });
      const account = createUser();

      try {
        await register(request, account);
        await login(request, account);
        await request.storageState({ path: storageStatePath });
        await use({ account, storageStatePath });
      } finally {
        // Best-effort cleanup: a leaked test account must not mask a failure.
        await deleteAccount(request, account).catch(() => undefined);
        await request.dispose();
        await rm(storageStatePath, { force: true });
      }
    },
    { scope: 'worker' },
  ],
});
