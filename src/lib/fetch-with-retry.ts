/**
 * Fetch with automatic retry and exponential backoff.
 */
export async function fetchWithRetry(
  url: string,
  opts: RequestInit = {},
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        ...opts,
        signal: opts.signal || AbortSignal.timeout(10000),
      });
      if (!res.ok && res.status >= 500 && attempt < maxRetries) {
        throw new Error(`Server error: ${res.status}`);
      }
      return res;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }
  throw new Error('Max retries exceeded');
}
