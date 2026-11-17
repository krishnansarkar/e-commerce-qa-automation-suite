# E-commerce QA Automation Suite

End-to-end and API test suite for [automationexercise.com](https://automationexercise.com), built with
[Playwright](https://playwright.dev) and TypeScript.

## Requirements

- Node.js (the suite is developed on Node 26)
- npm

## Setup

```bash
npm ci
npx playwright install
```

## Running tests

```bash
npm run test:api                         # API tests, no browser
npm run test:headed                      # browser tests with a visible window
npm run test:report                      # open the last HTML report
npm run typecheck                        # tsc --noEmit over the whole project
```

The site under
test is a shared public demo with connection limits, so `playwright.config.ts` caps local workers at 4; CI runs one worker
with retries.

## Test layout

```
tests/
  api/        API contracts (*.api.spec.ts) - run by the `api` project
  page/       one spec per page object (*.page.spec.ts)
  fixture/    specs for the fixtures themselves
  *.spec.ts   cross-page end-to-end flows (login, signup)
lib/
  pages/      page object models
  fixtures/   auth and ad-blocking fixtures
  data/       test data factories (credentials, account form, payment card)
  utils/      shared helpers (popup dismissal, click-through-overlay navigation)
```

Browser specs drive the site through the page objects (`lib/pages`) rather than raw selectors.
Each page object documents the markup quirks it works around in its class-level comment.

## Fixtures

### `auth` - `lib/fixtures/auth.fixture.ts`

Registers a real account through the API once per worker, signs that session in, exposes it as the
worker's `storageState`, and deletes the account on teardown. Tests that need a signed-in user just
request the `auth` fixture; `auth.account` holds the credentials.

### `adblock` - `lib/fixtures/adblock.fixture.ts`

An auto fixture that routes every URL on the browser context and **aborts** requests to ad/tracking
hosts:

- `doubleclick.net`
- `googlesyndication.com`
- `fundingchoicesmessages.google.com`

Everything else is continued untouched. Blocking these removes the AdSense "vignette" overlay and
Google's consent prompt, which otherwise cover the page and intercept clicks on controls such as
"Place Order".

## Improvements:

### Long timeouts replaced with ad blocking

An earlier AI-generated version of these specs bumped per-test timeouts to **90 seconds** so the
slow, ad-covered flows could still finish. That workaround has been steered: ads are now handled
up front through an `adblock` fixture, which intercepts requests with a route and aborts the ad/tracking
hosts. The affected specs now complete inside the
default 30-second budget.
