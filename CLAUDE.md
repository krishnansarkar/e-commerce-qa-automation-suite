# Project: Playwright Testing

# Website Target
target = https://automationexercise.com
when I refer to target, replace it with the url.
For example, if I say go to target/login, you will go to https://automationexercise.com/login

## Locator Rules
1. ALWAYS prioritize Playwright's semantic, accessible locators over raw CSS or XPath selectors.
2. Order of preference:
   - `page.getByRole()`
   - `page.getByLabel()`
   - `page.getByPlaceholder()`
   - `page.getByText()`
   - unique css selector
3. DO NOT hallucinate selectors. Use `playwright-cli generate-locator` or `playwright-cli snapshot` to find valid elements on the target webpage.
4. `data-qa` is the site's test-id attribute: locate those elements with `page.getByTestId('...')`, never `page.locator('[data-qa="..."]')`. This works because `playwright.config.ts` sets `testIdAttribute: 'data-qa'`.

## Test Guidelines
- Write tests inside the `/tests` folder using semantic role locators.
- Execute headless via `npx playwright test`.
- Run tests with flag --project=chromium unless I explicitly say otherwise.
- Review HTML reports on test failures.

# Project Tools
- Playwright CLI is available via `npx playwright` or `playwright-cli`.

# Automation Constraints
- Do NOT invent custom browser automation scripts.
- Always use the `playwright-cli` command-line skill for snapshots, routing, and actions.