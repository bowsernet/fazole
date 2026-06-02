const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

export interface FetchOptions {
  retries?: number; // default 3
  retryDelayMs?: number; // default 10_000
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export async function fetchPage(url: string, opts: FetchOptions = {}): Promise<string> {
  const retries = opts.retries ?? 3;
  const retryDelayMs = opts.retryDelayMs ?? 10_000;

  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: BROWSER_HEADERS });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.text();
    } catch (err) {
      lastError = err;
      console.warn(`fetch ${url} attempt ${attempt}/${retries} failed: ${String(err)}`);
      if (attempt < retries) await sleep(retryDelayMs);
    }
  }
  throw new Error(`Failed to fetch ${url} after ${retries} attempts: ${String(lastError)}`);
}
