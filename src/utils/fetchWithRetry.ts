export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

const RETRYABLE_ERRORS = [
  'Failed to fetch',
  'NetworkError',
  'Network error',
  'Load failed',
  'network',
  'ECONNRESET',
  'ETIMEDOUT',
];

function isRetryableError(error: any): boolean {
  if (!error) return false;
  const message = error.message || String(error);
  return RETRYABLE_ERRORS.some(e => message.toLowerCase().includes(e.toLowerCase()));
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const { maxRetries = 3, baseDelayMs = 500, maxDelayMs = 5000 } = retryOptions;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        credentials: options.credentials || 'include',
      });
      return response;
    } catch (error: any) {
      lastError = error;

      if (!isRetryableError(error) || attempt === maxRetries) {
        throw error;
      }

      const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Fetch failed after retries');
}
