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

The Playwright HTML report from pushes to `main` is published to GitHub Pages. Pull requests keep their reports as
downloadable workflow artifacts. To enable publishing, set the repository's **Settings → Pages → Build and deployment →
Source** to **GitHub Actions** once.

## Test layout

```
tests/
  api/        API contracts (*.api.spec.ts) - run by the `api` project
  *.spec.ts   cross-page end-to-end flows (login, logout, signup, purchase)
lib/
  pages/      page object models
  fixtures/   auth and ad-blocking fixtures
  components/ shared component objects (product cards, add-to-cart modal)
  data/       test data factories (user, payment card)
  utils/      shared helpers
fixtures/
  fixtures.ts         the `test` / `authTest` entry point every spec imports
  retry-logic.fixture.ts  retry delay for the throttled demo site
```

Browser specs drive the site through the page objects (`lib/pages`) and their shared components (`lib/components`) rather than raw selectors.
Each page object documents the markup quirks it works around in its class-level comment.

## Fixtures

### `auth` - `lib/fixtures/auth.fixture.ts`

Registers a real account through the API once per worker, signs that session in, exposes it as the
worker's `storageState`, and deletes the account on teardown. Tests that need a signed-in user just
request the `auth` fixture; `auth.account` holds the generated user (credentials plus account
information).

### `adblock` - `lib/fixtures/adblock.fixture.ts`

An auto fixture that routes every URL on the browser context and **aborts** requests to ad/tracking
hosts:

- `doubleclick.net`
- `googlesyndication.com`
- `fundingchoicesmessages.google.com`

Everything else is continued untouched. Blocking these removes the AdSense "vignette" overlay and
Google's consent prompt, which otherwise cover the page and intercept clicks on controls such as
"Place Order".

### `retry` - `fixtures/retry-logic.fixture.ts`

An auto fixture that waits **5 seconds** before a retried test (`testInfo.retry > 0`) runs; the first
attempt is untouched. The target is a shared public demo that throttles requests (see
`playwright.config.ts`), so an immediate retry tends to hit the same queue-full/5xx condition that
failed the first attempt. The delay gives those limits time to clear.

It is merged into the default `test` exported by `fixtures/fixtures.ts`, so every spec gets it
without importing anything extra. It only has an effect when retries are enabled: CI sets
`retries: 2`, while local runs default to `0`, so pass `--retries=N` to exercise it locally.

Note that the delay only spaces out attempts; it does not reset server-side state such as a
signed-in account's cart. That is why the auth fixture stays opt-in (`authTest`) rather than being
merged into the default `test`.

## Improvements:

### Long timeouts replaced with ad blocking fixture

An earlier AI-generated version of these specs bumped per-test timeouts to **90 seconds** and
inserted timeouts on page clicks so the slow, ad-covered flows could still finish. That workaround
has been steered: ads are now handled up front through an `adblock` fixture, which intercepts
requests and aborts the ad/tracking hosts. The e2e specs now run inside the default 30-second
budget.

### Shared product component instead of reaching across pages

The first AI-generated version of the purchase test used the products page object to find and add a
product while the browser was still on the homepage - it only worked because both pages happen to
render the same markup, and it tied a homepage step to a page object for a page the test never
visited. I steered it to extract the common product-card elements and add-to-cart behaviour into
`lib/components/products-nav.component.ts`. `HomePage` and `ProductsPage` now both compose that
component, and the purchase test uses purely the homepage for that step.

### Auth fixture carries the whole account, not just credentials

An early AI-generated version of the auth fixture originally generated login credentials only,
so a signed-in test that needed address details had to rebuild the account form from a second factory
right before posting it. That meant one logical user was assembled from two unrelated modules
at every call site. I corrected this by combining the factories into a single `lib/data/user.ts`
and updating types appropriately.

### Auth API calls extracted into `lib/utils/account-api.ts` and Auth fixture overreliance removed

Register, login, and delete-account requests started as private helpers inside
`lib/fixtures/auth.fixture.ts`. The login spec was using the auth fixture's credentials, but
overriding its session handling. These API requests are now extracted into `lib/utils/account-api.ts`
and used directly where applicable.

### `data-qa` hooks read through `getByTestId`

The page objects addressed the site's `data-qa` attributes with raw selectors such as
`page.locator('[data-qa="zipcode"]')`. I corrected this by configuring `testIdAttribute: 'data-qa'`
in `playwright.config.ts` and replacing every raw `[data-qa="..."]` selector with
`page.getByTestId('...')`, so the test hooks now go through Playwright's built-in accessor.

### Cart coverage and typed amount getters

Cart coverage started as assertions written directly in the spec, reading names and prices with
`innerText()` at each call site and parsing the row total with a local helper. I steered those reads
into page-object methods: `getProductName`, `getProductPrice`, and `getProductTotal` on `CartPage`,
plus matching `getProductName`/`getProductPrice` getters on `ProductsPage` and
`ProductDetailsPage`. I also had `getProductPrice` return a `number` instead of a formatted
`"Rs. ..."` string, backed by a shared parser in `lib/utils/amount.ts`, so prices are compared as
amounts and the specs no longer carry rupee formatting or regexes.
