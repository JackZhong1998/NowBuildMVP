import { defineConfig, devices } from '@playwright/test';

const port = process.env.PLAYWRIGHT_PORT ?? '3002';
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90_000,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
  ],
  webServer: {
    command: `NODE_OPTIONS=--dns-result-order=ipv4first NOWBUILD_DEMO_MODE=true NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=xxxxx CLERK_SECRET_KEY=xxxxx npm run dev -- -p ${port}`,
    // Probe a public route so an existing server can be reused even when Clerk
    // protects the dashboard or is intentionally running with real credentials.
    url: `${baseURL}/zh`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
