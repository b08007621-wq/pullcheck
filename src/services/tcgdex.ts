import { type CachePolicy, cachedFetch } from './cache';
import { ApiError, getJson } from './http';

type TcgdexSet = {
  id: string;
  name: string;
  logo?: string;
  symbol?: string;
};

const SETS_URL = 'https://api.tcgdex.net/v2/ja/sets';
const LOGO_CACHE: CachePolicy = { bucket: 'tcgdex-ja-sets', ttlMs: 7 * 24 * 60 * 60 * 1000, maxEntries: 1 };

export async function loadJapaneseLogos(): Promise<Record<string, string>> {
  const { value } = await cachedFetch('ja', LOGO_CACHE, async () => {
    const sets = await getJson<TcgdexSet[]>(SETS_URL, { timeoutMs: 12_000 });
    if (!Array.isArray(sets)) throw new ApiError('badResponse');
    const logos: Record<string, string> = {};
    for (const set of sets) {
      const image = set.logo ?? set.symbol;
      if (set.id && image) logos[setCode(set.id)] = `${image}.png`;
    }
    return logos;
  });
  return value;
}

export function setCode(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}
