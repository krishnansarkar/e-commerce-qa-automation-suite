import { test as base } from '@playwright/test';

const RETRY_DELAY_MS = 5_000;

/**
 * `test` with a pause on retries.
 *
 * The demo site throttles bursts of traffic, so an immediate retry tends to hit
 * the same queue-full / 5xx state that failed the first attempt. This auto
 * fixture runs before every test and, when it is a retry (`testInfo.retry > 0`),
 * waits `RETRY_DELAY_MS * testInfo.retry` to let that state clear. The first attempt is
 * untouched.
 */
export const test = base.extend<{ retryDelay: void }>({
  retryDelay: [
    async ({}, use, testInfo) => {
      if (testInfo.retry > 0) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * testInfo.retry));
      }

      await use();
    },
    { auto: true },
  ],
});
