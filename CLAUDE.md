# Project: Playwright Testing

## Locator Rules
1. ALWAYS prioritize Playwright's semantic, accessible locators over raw CSS or XPath selectors.
2. Order of preference:
   - `page.getByRole()`
   - `page.getByLabel()`
   - `page.getByPlaceholder()`
   - `page.getByText()`
3. DO NOT hallucinate selectors. Use `playwright-cli generate-locator` or `playwright-cli snapshot` to find valid elements on the target webpage.
## Test Guidelines
- Write tests inside the `/tests` folder using semantic role locators.
- Execute headless via `npx playwright test`.
- Run tests with flag --project=chromium
- Review HTML reports on test failures.