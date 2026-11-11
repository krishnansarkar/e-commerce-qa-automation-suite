import { type Page } from '@playwright/test';

/**
 * Best-effort dismissal of popups/overlays that can cover page content.
 *
 * Currently handles the Google consent dialog and generic Bootstrap-style
 * modals used for ads/promos. Never throws: a missing or misbehaving popup
 * must not fail the test.
 */
export async function dismissPopups(page: Page): Promise<void> {
  const consentRoot = page.locator('.fc-consent-root');
  const consentButton = consentRoot.getByRole('button', { name: /^consent$/i });

  if (await consentButton.isVisible().catch(() => false)) {
    await consentButton.click().catch(() => undefined);
    await consentRoot.waitFor({ state: 'hidden' }).catch(() => undefined);
  }

  const modal = page.locator('.modal.show');
  const modalClose = modal.locator('button.close, [data-dismiss="modal"]');

  if (await modalClose.first().isVisible().catch(() => false)) {
    await modalClose.first().click().catch(() => undefined);
    await modal.waitFor({ state: 'hidden' }).catch(() => undefined);
  }
}
