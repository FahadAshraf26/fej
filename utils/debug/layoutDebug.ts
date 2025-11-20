// Debug utility for layout calculations
// This file should be tree-shaken in production builds

import { DebugLevel, HeightsDebugData, SectionDebugData, DishGapDebugData } from './types';
import { isDebugEnabled, getDebugLevel, isPerformanceLoggingEnabled, getPerformanceThreshold } from '../../config/debug.config';

// Debug group styling
const GROUP_STYLE = 'color: #4CAF50; font-size: 14px; font-weight: bold';
const SUBGROUP_STYLE = 'color: #2196F3; font-weight: bold';

// Main debug logger
const debug = {
  layout: {
    heights: (data: HeightsDebugData) => {
      if (!isDebugEnabled('layout') || getDebugLevel('layout') < DebugLevel.DEBUG) return;

      console.group('Layout Heights Calculation');
      console.log('Input Dish Blocks:', data.dishBlocks);
      console.log('Sections Analysis:', data.sectionsAnalysis);
      console.log('Generated Combinations:', data.combinations);
      console.log('Selected Max Combination:', data.maxCombination);
      console.groupEnd();
    },

    section: (data: SectionDebugData) => {
      if (!isDebugEnabled('layout') || getDebugLevel('layout') < DebugLevel.DEBUG) return;

      console.group('Section Height Calculation');
      console.log('Input Parameters:', data.inputParams);
      console.log('Is Single Column:', data.isSingleColumn);
      
      if (data.isSingleColumn && data.singleColumnAnalysis) {
        console.log('Single Column Analysis:', data.singleColumnAnalysis);
      } else if (data.multiColumnAnalysis) {
        console.log('Multi Column Analysis:', data.multiColumnAnalysis);
        console.log('Column Selection:', data.columnSelection);
      }
      
      console.groupEnd();
    },

    dishGap: (data: DishGapDebugData) => {
      if (!isDebugEnabled('layout') || getDebugLevel('layout') < DebugLevel.DEBUG) return;

      console.group('Dish Gap Calculation');
      console.log('Input Parameters:', data.inputParams);
      console.log('Calculations:', data.calculations);
      console.log('Final Calculation:', data.finalCalculation);
      console.groupEnd();
    }
  },

  performance: (functionName: string, startTime: number) => {
    if (!isPerformanceLoggingEnabled()) return;

    const endTime = performance.now();
    const executionTime = endTime - startTime;
    const threshold = getPerformanceThreshold();

    if (executionTime > threshold) {
      console.warn(`Performance Warning: ${functionName} took ${executionTime.toFixed(2)}ms to execute (threshold: ${threshold}ms)`);
    }
  }
};

export { debug }; 