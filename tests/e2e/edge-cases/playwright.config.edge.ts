import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '../../e2e',
  testMatch: ['edge-cases/**/*.spec.ts', 'l13-*.spec.ts'],
  fullyParallel: true,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    permissions: ['clipboard-read','clipboard-write'],
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_E2E_CAPTURE: '1',
      NEXT_PUBLIC_FF_LONG_PASTE_GUARD_PCT: '100',
      NEXT_PUBLIC_LONG_PASTE_CHAR_LIMIT: '12000',
      NEXT_PUBLIC_FF_MULTI_PDF: '1',
      NEXT_PUBLIC_FF_CURRENCY_NORM: '1',
      NEXT_PUBLIC_FF_CATEGORY_CHOOSER_PCT: '100',
    },
  },
});


