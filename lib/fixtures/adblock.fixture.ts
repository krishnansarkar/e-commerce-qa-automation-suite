import { test as base } from '@playwright/test';

/**
 * URL fragments of third-party ad/tracking hosts that are aborted at the
 * network layer.
 *
 * `fundingchoicesmessages.google.com` serves Google's "funding choices"
 * consent prompt and the ad scripts' supporting calls, and is what the site
 * actually contacts (verified with `playwright-cli requests`).
 */
export const BLOCKED_URL_FRAGMENTS = [
  'doubleclick.net',
  'googlesyndication.com',
  'fundingchoicesmessages.google.com',
] as const;

/** True when a URL belongs to one of the blocked ad/tracking hosts. */
export function isBlockedAd(url: string): boolean {
  return BLOCKED_URL_FRAGMENTS.some((fragment) => url.includes(fragment));
}

/**
 * `test` with every ad/tracking request aborted.
 *
 * The auto fixture routes every URL on the browser context (so it covers popups
 * as well as the page) and aborts any request whose URL matches
 * `BLOCKED_URL_FRAGMENTS`; everything else is continued untouched. This keeps
 * the site's AdSense "vignette" overlay and Google consent prompt from covering
 * the page, which is what makes buttons such as "Place Order" unclickable.
 *
 * Suites that also need another fixture (e.g. the authenticated one) combine
 * the two with `mergeTests()` rather than duplicating this route handler.
 */
export const test = base.extend<{ blockAds: void }>({
  blockAds: [
    async ({ context }, use) => {
      await context.route('**/*', (route) =>
        isBlockedAd(route.request().url()) ? route.abort() : route.continue(),
      );

      await use();
    },
    { auto: true },
  ],
});
