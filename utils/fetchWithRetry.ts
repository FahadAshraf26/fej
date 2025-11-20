/**
 * Fetches a resource with timeout and retry logic for slow networks
 */
export interface FetchWithRetryOptions extends RequestInit {
  timeout?: number; // Timeout in milliseconds (default: 60000 for 60 seconds)
  maxRetries?: number; // Maximum number of retry attempts (default: 3)
  retryDelay?: number; // Initial retry delay in milliseconds (default: 1000)
  retryOnTimeout?: boolean; // Whether to retry on timeout (default: true)
  retryOnNetworkError?: boolean; // Whether to retry on network errors (default: true)
}

/**
 * Fetches a resource with timeout and automatic retry on failure
 */
export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const {
    timeout = 60000, // 60 seconds default timeout
    maxRetries = 3,
    retryDelay = 1000,
    retryOnTimeout = true,
    retryOnNetworkError = true,
    ...fetchOptions
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Check if response is ok
        if (!response.ok) {
          // For 4xx errors (client errors), don't retry
          if (response.status >= 400 && response.status < 500 && attempt < maxRetries) {
            // Only retry on specific 4xx errors that might be transient
            if (response.status === 408 || response.status === 429) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            // For other 4xx errors, throw immediately
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          // For 5xx errors (server errors), retry
          if (response.status >= 500 && attempt < maxRetries) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        }

        return response;
      } catch (error: any) {
        clearTimeout(timeoutId);

        // Check if it's an abort error (timeout)
        if (error.name === "AbortError" || error.message?.includes("aborted")) {
          if (retryOnTimeout && attempt < maxRetries) {
            lastError = new Error(`Request timeout after ${timeout}ms`);
            const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
            console.log(
              `Fetch timeout, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
          throw new Error(`Request timeout after ${timeout}ms`);
        }

        // Check if it's a network error
        if (
          (error.message?.includes("network") ||
            error.message?.includes("Failed to fetch") ||
            error.message?.includes("NetworkError") ||
            !navigator.onLine) &&
          retryOnNetworkError &&
          attempt < maxRetries
        ) {
          lastError = error;
          const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
          console.log(
            `Network error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1}):`,
            error.message
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // Re-throw if we shouldn't retry or have exhausted retries
        throw error;
      }
    } catch (error: any) {
      lastError = error;

      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }

      // For other errors, retry with exponential backoff
      const delay = retryDelay * Math.pow(2, attempt);
      console.log(
        `Fetch error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1}):`,
        error.message
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error("Failed to fetch resource");
}

/**
 * Fetches a blob with timeout and retry logic
 */
export async function fetchBlobWithRetry(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<Blob> {
  const response = await fetchWithRetry(url, options);
  return await response.blob();
}

/**
 * Fetches JSON with timeout and retry logic
 */
export async function fetchJSONWithRetry<T = any>(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<T> {
  const response = await fetchWithRetry(url, options);
  return await response.json();
}

/**
 * Fetches text with timeout and retry logic
 */
export async function fetchTextWithRetry(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<string> {
  const response = await fetchWithRetry(url, options);
  return await response.text();
}
