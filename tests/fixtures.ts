import { test as base } from '@playwright/test';
import { DashboardPage } from './pages/DashboardPage';
import { settings } from '../playwright.config';

// Declare your test types
type MyFixtures = {
  dashboardPage: DashboardPage;
  settings: typeof settings;
};

// Extend base test by providing "dashboardPage" and "settings"
export const test = base.extend<MyFixtures>({
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
  settings: async ({}, use) => {
    await use(settings);
  },
});

export { expect } from '@playwright/test'; 