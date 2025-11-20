import { defineConfig, devices } from "@playwright/test";
import { Settings } from './tests/types';
import * as dotenv from 'dotenv';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
dotenv.config({ path: '.env.local' });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./tests",
  timeout: 120_000,
  expect: {
    timeout: 10_000,
  },
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: 0,
  /* Opt out of parallel tests on CI. */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['json', { outputFile: 'playwright-report/report.json' }]
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'setup',
      testMatch: '**/setup.ts',
      use: { 
        ...devices['Desktop Chrome'],
        video: 'on-first-retry',
        screenshot:'only-on-failure',
        trace: 'on-first-retry',
        actionTimeout: 15000
      },
    },
    {
      name: "chromium",
      // dependencies: ['setup'],
      use: { 
        ...devices["Desktop Chrome"],
        storageState: 'auth.json', // Use the auth state saved by setup
        video: 'on-first-retry',
        screenshot:'only-on-failure',
        trace: 'on-first-retry',
        actionTimeout: 15000
      },
    }
    // {
    //   name: "firefox",
    //   dependencies: ['setup'],
    //   use: { 
    //     ...devices["Desktop Firefox"],
    //     storageState: 'auth.json',
    //   },
    // },
    // {
    //   name: "webkit",
    //   dependencies: ['setup'],
    //   use: { 
    //     ...devices["Desktop Safari"],
    //     storageState: 'auth.json',
    //   },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});

// Extend the test fixture types
export const settings: Settings = {
  baseUrl: 'http://localhost:3000'
};
