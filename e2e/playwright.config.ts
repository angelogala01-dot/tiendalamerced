import { E2E_CONFIG } from './helpers/load-env';

// Carga variables de backend/.env y admin/.env.local al iniciar Playwright
void E2E_CONFIG;

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  timeout: 60_000,
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'store',
      testMatch: /store\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:3000' },
    },
    {
      name: 'admin',
      testMatch: /(admin|products\.admin).*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:3001' },
    },
    {
      name: 'api',
      testMatch: /(api-security|products\.api)\.spec\.ts/,
      use: { baseURL: 'http://localhost:4000/api/v1' },
    },
  ],
});
