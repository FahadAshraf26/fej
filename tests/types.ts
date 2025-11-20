import { PlaywrightTestArgs } from '@playwright/test';

export interface Settings {
  baseUrl: string;
}

declare global {
  namespace PlaywrightTest {
    interface TestArgs extends PlaywrightTestArgs {
      settings: Settings;
    }
  }
} 