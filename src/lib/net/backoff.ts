export interface BackoffOptions {
  base?: number;
  factor?: number;
  jitter?: number;
  maxAttempts?: number;
}

export async function backoff<T>(
  fn: () => Promise<T>,
  opts: BackoffOptions = {}
): Promise<T> {
  const {
    base = 500,
    factor = 2,
    jitter = 0.2,
    maxAttempts = 5
  } = opts;

  let lastError: any;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on 4xx errors (client errors), except 429 (rate limiting)
      if (error?.status >= 400 && error?.status < 500 && error?.status !== 429) {
        throw error;
      }
      
      // If this was the last attempt, throw
      if (attempt === maxAttempts - 1) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = base * Math.pow(factor, attempt);
      
      // Add jitter to prevent thundering herd
      const jitterAmount = delay * jitter * (Math.random() * 2 - 1);
      const finalDelay = Math.max(0, delay + jitterAmount);
      
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, finalDelay));
    }
  }
  
  throw lastError;
}
