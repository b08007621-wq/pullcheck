import { type CachePolicy, cachedFetch } from './cache';
import { ApiError, getText } from './http';

const CLOCK_URL = 'https://tcgcsv.com/last-updated.txt';
const CLOCK_CACHE: CachePolicy = { bucket: 'tcgcsv-clock', ttlMs: 20 * 60 * 1000, maxEntries: 1 };

export async function fetchPricesUpdatedAt(options: { force?: boolean } = {}): Promise<string | null> {
  try {
    const { value } = await cachedFetch(
      'last',
      CLOCK_CACHE,
      async () => {
        const text = await getText(CLOCK_URL, {
          headers: { 'User-Agent': 'PullCheck/1.0 (iOS; Expo)' },
          maxAttempts: 3,
          timeoutMs: 8000,
        });
        const time = Date.parse(text.trim().replace(/([+-]\d{2})(\d{2})$/, '$1:$2'));
        if (Number.isNaN(time)) throw new ApiError('badResponse');
        return new Date(time).toISOString();
      },
      options,
    );
    return value;
  } catch {
    return null;
  }
}
