import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.ts$/,
  testIgnore: '**/comparison/**',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    permissions: ['clipboard-read', 'clipboard-write'],
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_E2E_CAPTURE: '1',
      NEXT_PUBLIC_FF_INCREDIBLE_BRIEF_PCT: '100',
      NEXT_PUBLIC_BRC_PORTAL_ENABLED: 'true',
      // L13 flags and thresholds for deterministic tests
      NEXT_PUBLIC_FF_MULTI_PDF: '1',
      NEXT_PUBLIC_FF_CURRENCY_NORM: '1',
      NEXT_PUBLIC_FF_LONG_PASTE_GUARD_PCT: '100',
      NEXT_PUBLIC_LONG_PASTE_CHAR_LIMIT: '100',
      NEXT_PUBLIC_LONG_PASTE_TOKEN_LIMIT: '50',
      NEXT_PUBLIC_FF_CATEGORY_CHOOSER_PCT: '100',
      NEXT_PUBLIC_FF_OCR_FALLBACK: '1',
      // Stable FX for server normalization tests (also used in e2e mocks if needed)
      USD_TO_COP: '5000',
      EUR_TO_COP: '5500',
      MXN_TO_COP: '250',
    },
  },
});
