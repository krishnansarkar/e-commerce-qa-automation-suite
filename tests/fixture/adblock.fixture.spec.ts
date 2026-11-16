import { expect } from '@playwright/test';
import { test, BLOCKED_URL_FRAGMENTS, isBlockedAd } from '../../lib/fixtures/adblock.fixture';
import { HomePage } from '../../lib/pages/home.page';

test.describe('Ad-blocking fixture', () => {
  test('isBlockedAd() recognises every blocked host', () => {
    for (const fragment of BLOCKED_URL_FRAGMENTS) {
      expect(isBlockedAd(`https://${fragment}/some/resource.js`)).toBe(true);
    }

    expect(isBlockedAd('https://example.com/ads')).toBe(false);
    expect(isBlockedAd('https://automationexercise.com/products')).toBe(false);
    expect(isBlockedAd('https://www.googletagmanager.com/gtm.js')).toBe(false);
  });

  test('ad requests are aborted while the site still works', async ({ page }) => {
    const aborted: string[] = [];
    const served: string[] = [];

    page.on('requestfailed', (request) => aborted.push(request.url()));
    page.on('response', (response) => served.push(response.url()));

    const home = new HomePage(page);
    await home.goto();
    await expect(home.heroHeading).toBeVisible();
    await expect(home.signupLoginLink).toBeVisible();

    // The site's own document is served...
    expect(served).toContain('https://automationexercise.com/');

    // ...while ad/tracking requests were attempted and aborted, never served.
    expect(aborted.filter(isBlockedAd).length).toBeGreaterThan(0);
    expect(served.filter(isBlockedAd)).toHaveLength(0);
  });
});
