# E2E Tests for Step-11

This directory contains end-to-end tests for the Step-11 flows using Playwright.

## Test Flows

1. **Paste → Brief Flow** (`paste-brief.spec.ts`)
   - Tests pasting policy text and generating a brief
   - Verifies telemetry events: PASTE_STARTED, PASTE_CONFIRMED, SEARCH_STARTED, SEARCH_COMPLETED
   - Ensures sidebar becomes visible with plan results

2. **PDF → Brief Flow** (`pdf-brief.spec.ts`)
   - Tests uploading a PDF and analyzing it
   - Uses sample-policy.pdf fixture
   - Best-effort assertions due to server processing
   - Verifies no runtime errors occur

3. **No-Catalog → Templates → Proposal Flow** (`templates-proposal.spec.ts`)
   - Tests template generation for categories
   - Verifies TEMPLATES_GENERATED event
   - Tests proposal creation with TIME_TO_PROPOSAL_MS tracking

## Prerequisites

Before running tests, ensure:
1. The development server is running or will be started by Playwright
2. Set the environment variable: `NEXT_PUBLIC_E2E_CAPTURE=1`
3. Required test IDs are implemented in the application

## Running Tests

```bash
# Install dependencies (if not already done)
npm install

# Install Playwright browsers
npx playwright install

# Run all tests
npm run test:e2e

# Run specific test file
npx playwright test tests/e2e/step11/paste-brief.spec.ts

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run tests with UI mode (interactive)
npx playwright test --ui
```

## Test Requirements

The tests expect these data-testid attributes in the application:
- paste-policy-chip
- paste-textarea
- paste-confirm-button
- paste-error
- search-loading
- plan-results-sidebar
- brief-panel
- plan-result-card
- pdf-analyzer-chip
- pdf-analyzer-modal
- pdf-upload-input
- pdf-processing
- pdf-analysis-complete
- pdf-upload-error
- category-health
- category-other
- template-card
- no-templates-message
- create-proposal-button
- proposal-loading
- proposal-complete
- proposal-view

## Telemetry Capture

Tests verify telemetry events are captured correctly via `window.__captureTelemetry`.
The NEXT_PUBLIC_E2E_CAPTURE=1 environment variable enables this capture mechanism.
