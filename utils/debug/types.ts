// Debug levels
export enum DebugLevel {
  NONE = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
  TRACE = 5
}

// Type definitions for debug data
export interface HeightsDebugData {
  dishBlocks: any[];
  sectionsAnalysis: any[];
  combinations: any[];
  maxCombination: any;
}

export interface SectionDebugData {
  inputParams: {
    oneColumn: boolean;
    titleHeight: number;
    isSectionTitle: boolean;
    sectionSpacerHeight: number;
    totalDishes: number;
  };
  isSingleColumn: boolean;
  singleColumnAnalysis?: {
    totalDishes: number;
    nonSpacerDishes: number;
    dishTypeCount: Record<string, number>;
    sectionHeight: number;
  };
  multiColumnAnalysis?: any;
  columnSelection?: any;
}

export interface DishGapDebugData {
  inputParams: {
    pageHeightWithSpacing: number;
    maxCombinationInfo: any;
    rowTransitions: number;
    sectionGapMultiplier: number;
  };
  calculations: {
    additionalSpaces: number;
    totalSpaces: number;
    availableSpace: number;
    contentHeight: number;
    dishCount: number;
  };
  finalCalculation: {
    minDishGap: number;
    calculation: string;
  };
} 