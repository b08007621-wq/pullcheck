import { type CachePolicy, cachedFetch } from './cache';
import { ApiError, getText } from './http';

const DAY = 24 * 60 * 60 * 1000;
const SYMBOL_CACHE: CachePolicy = { bucket: 'set-symbol', ttlMs: 14 * DAY, maxEntries: 400 };
const BLACK_FILL = /fill="(#000|#000000|black)"/gi;

export async function getSetSymbolXml(url: string, signal?: AbortSignal): Promise<string> {
  const { value } = await cachedFetch(url, SYMBOL_CACHE, async () => {
    const text = (await getText(url, { signal, maxAttempts: 2 })).replace(/^\s*<\?xml[^>]*\?>/i, '');
    if (!/^\s*<svg[\s>]/i.test(text)) throw new ApiError('notFound');
    return text.replace(BLACK_FILL, 'fill="currentColor"').replace(/^\s*<svg/i, '<svg fill="currentColor"');
  });
  return value;
}
