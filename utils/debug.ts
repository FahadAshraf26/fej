const isDevelopment = process.env.NODE_ENV === 'development';

interface DebugOptions {
  groupName?: string;
  color?: string;
  fontSize?: string;
  fontWeight?: string;
}

const defaultOptions: DebugOptions = {
  color: '#4CAF50',
  fontSize: '14px',
  fontWeight: 'bold'
};

export const debug = {
  group: (name: string, options: DebugOptions = {}) => {
    if (!isDevelopment) return;
    
    const { color, fontSize, fontWeight } = { ...defaultOptions, ...options };
    console.group(`%c🔍 ${name}`, `color: ${color}; font-size: ${fontSize}; font-weight: ${fontWeight}`);
  },

  log: (message: string, data?: any) => {
    if (!isDevelopment) return;
    console.log(message, data);
  },

  table: (data: any) => {
    if (!isDevelopment) return;
    console.table(data);
  },

  groupEnd: () => {
    if (!isDevelopment) return;
    console.groupEnd();
  },

  performance: (functionName: string, startTime: number) => {
    if (!isDevelopment) return;
    
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    console.log(
      `%c⚡%c [BOOSTED_PERFORMANCE]%c ${functionName}: ${executionTime.toFixed(2)}ms`,
      "color: #FFD700; font-size: 16px;",
      "color: green; font-weight: bold",
      "color: inherit; font-weight: normal"
    );
    return executionTime;
  }
}; 