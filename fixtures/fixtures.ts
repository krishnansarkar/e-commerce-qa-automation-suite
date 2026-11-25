import { mergeTests } from '@playwright/test';
import { test as adBlockTest } from '../lib/fixtures/adblock.fixture';
import { test as authTestBase } from '../lib/fixtures/auth.fixture';
import { test as retryLogicTest } from './retry-logic.fixture';

export { expect } from '@playwright/test';

/**
 * The default `test` every spec imports.
 *
 * Merges the fixtures that are safe for all tests:
 * - ad/tracking requests are aborted (`adblock.fixture`);
 * - retried tests wait a few seconds before running (`retry-logic.fixture`).
 *
 * The auth fixture is deliberately NOT merged here. It overrides the built-in
 * `storageState` option, so merging it would sign every test into the same
 * worker account: guest specs would see the signed-in header, and cart specs
 * would inherit the account's server-side cart from earlier tests.
 */
export const test = mergeTests(adBlockTest, retryLogicTest);

/**
 * `test` plus the worker-scoped `auth` / `storageState` fixtures, for specs that
 * need to start signed in. Import it from this module instead of composing
 * `mergeTests()` in the spec:
 *
 *     import { authTest as test } from '../fixtures/fixtures';
 */
export const authTest = mergeTests(test, authTestBase);
