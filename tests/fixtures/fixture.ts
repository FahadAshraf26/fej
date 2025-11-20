import { test as base } from "@playwright/test";
import { settings } from "./settings";
import { LandingPage } from "../pages/LandingPage";
import { DashboardPage } from "../pages/DashboardPage";

export type TestFixtures = {
    settings: settings;
    landingPage: LandingPage;
    dashboardPage: DashboardPage;
};

export const test = base.extend<TestFixtures>({
    settings: async ({ }, use) => {
        await use(new settings());
    },
    landingPage: async ({ page }, use) => {
        await use(new LandingPage(page));
    },
    dashboardPage: async ({ page }, use) => {
        await use(new DashboardPage(page));
    },
});

export { expect } from '@playwright/test'; 