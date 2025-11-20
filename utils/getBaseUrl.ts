export const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    // Browser should use relative path
    return window.location.origin;
  }

  // Server should use environment variable
  return process.env.NEXT_PUBLIC_BASE_URL;
};
