export const MILLISECONDS_PER_SECOND = 1000;

// Helper function to convert Unix timestamp to Date
export const unixToDate = (timestamp: number): Date => {
  return new Date(timestamp * MILLISECONDS_PER_SECOND);
};

// Helper function to safely convert nullable Unix timestamp to Date
export const safeUnixToDate = (timestamp: number | null): Date | null => {
  return timestamp ? unixToDate(timestamp) : null;
};
