/**
 * Application-wide settings and configuration
 */

export const APP_SETTINGS = {
  TRIAL: {
    DEFAULT_DAYS: 7,
    MAX_EXTENSION_DAYS: 30,
  },
  BILLING: {
    // Add other billing-related settings here if needed
  },
} as const;

// Export individual settings for easier imports
export const TRIAL_DAYS = APP_SETTINGS.TRIAL.DEFAULT_DAYS;
export const MAX_TRIAL_EXTENSION_DAYS = APP_SETTINGS.TRIAL.MAX_EXTENSION_DAYS;
export const MAX_TRIAL_EXTENSIONS = MAX_TRIAL_EXTENSION_DAYS - TRIAL_DAYS;
