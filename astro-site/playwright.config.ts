import { defineConfig, devices } from '@playwright/test';

// A supplied preview URL is tested as-is; never replace a running user preview.
const previewBaseURL = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: process.env.CI ? 1 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'list' : 'html',
  use: {
    baseURL: previewBaseURL || 'http://127.0.0.1:4334',
    trace: 'retain-on-failure',
  },
  webServer: previewBaseURL ? undefined : {
    command: 'npm run preview -- --host 127.0.0.1 --port 4334',
    url: 'http://127.0.0.1:4334/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
