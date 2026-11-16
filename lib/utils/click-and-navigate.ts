import { type Locator, type Page } from '@playwright/test';

/**
 * Click a navigation control and wait for the expected URL.
 *
 * automationexercise.com serves Google AdSense "vignette" overlays that cover
 * the page and do not release pointer events (the same overlay that can strand
 * the "Continue" button on /account_created). A plain `click()` then fails
 * against the overlay, so this helper retries by invoking the element's own
 * click handler, which still performs the link navigation or form submission.
 *
 * Use it only for controls that navigate; a swallowed click must not be
 * mistaken for a successful one, hence the URL wait in both attempts.
 */
export async function clickAndNavigate(page: Page, target: Locator, url: RegExp): Promise<void> {
  const navigated = (timeout: number) =>
    page
      .waitForURL(url, { waitUntil: 'domcontentloaded', timeout })
      .then(() => true)
      .catch(() => false);

  // Short timeout: being blocked by an overlay is expected, not an error.
  await target.click({ timeout: 5_000 }).catch(() => undefined);
  if (await navigated(10_000)) {
    return;
  }

  await target.evaluate((element) => (element as HTMLElement).click());
  await page.waitForURL(url, { waitUntil: 'domcontentloaded' });
}
