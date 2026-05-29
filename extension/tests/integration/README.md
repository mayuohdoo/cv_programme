# Integration Tests

This directory contains Playwright-based integration tests for the extension.

## Running Integration Tests

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run integration tests
npx playwright test

# Run with UI mode
npx playwright test --ui

# Run specific test file
npx playwright test tests/integration/extension.spec.ts
```

## Test Structure

Integration tests should cover:
- Extension installation and initialization
- Communication between content script and background script
- Communication between extension and web page
- Form detection on real career pages
- Autofill operations end-to-end
- Application tracking workflow

## TODO

Add integration tests as features are implemented in subsequent tasks.
