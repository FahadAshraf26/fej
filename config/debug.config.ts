import { DebugLevel } from '../utils/debug/types';

export const DEBUG_CONFIG = {
  layout: {
    level: process.env.NODE_ENV === 'development' ? DebugLevel.DEBUG : DebugLevel.NONE,
    enabled: process.env.NODE_ENV === 'development',
    performance: {
      enabled: process.env.NODE_ENV === 'development',
      threshold: 100, // Log if function takes more than 100ms
    },
    sourceMaps: process.env.NODE_ENV === 'development',
  },
  // Add more debug categories as needed
  api: {
    level: process.env.NODE_ENV === 'development' ? DebugLevel.INFO : DebugLevel.ERROR,
    enabled: process.env.NODE_ENV === 'development',
  },
  state: {
    level: process.env.NODE_ENV === 'development' ? DebugLevel.INFO : DebugLevel.NONE,
    enabled: process.env.NODE_ENV === 'development',
  }
};

// Helper function to check if debug is enabled for a category
export const isDebugEnabled = (category: keyof typeof DEBUG_CONFIG): boolean => {
  return DEBUG_CONFIG[category]?.enabled ?? false;
};

// Helper function to get debug level for a category
export const getDebugLevel = (category: keyof typeof DEBUG_CONFIG): DebugLevel => {
  return DEBUG_CONFIG[category]?.level ?? DebugLevel.NONE;
};

// Helper function to check if performance logging is enabled
export const isPerformanceLoggingEnabled = (): boolean => {
  return DEBUG_CONFIG.layout.performance.enabled;
};

// Helper function to get performance threshold
export const getPerformanceThreshold = (): number => {
  return DEBUG_CONFIG.layout.performance.threshold;
}; 