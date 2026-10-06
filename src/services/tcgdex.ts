import { type CachePolicy, cachedFetch } from './cache';
import { ApiError, getJson } from './http';
import type { TcgcsvGroup } from './tcgcsv';

type TcgdexSet = {
  id: string;
  name: string;
  logo?: string;
  symbol?: string;
};

const SETS_URL = 'https://api.tcgdex.net/v2/ja/sets';
const LOGO_CACHE: CachePolicy = { bucket: 'tcgdex-ja-sets-v2', ttlMs: 7 * 24 * 60 * 60 * 1000, maxEntries: 1 };

export async function loadJapaneseLogos(): Promise<Record<string, string>> {
  const { value } = await cachedFetch('ja', LOGO_CACHE, async () => {
    const sets = await getJson<TcgdexSet[]>(SETS_URL, { timeoutMs: 12_000 });
    if (!Array.isArray(sets)) throw new ApiError('badResponse');
    const logos: Record<string, string> = {};
    for (const set of sets) {
      if (set.id && set.logo) logos[setCode(set.id)] = `${set.logo}.png`;
    }
    return logos;
  });
  return value;
}

export function setCode(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function japaneseLogo(logos: Record<string, string>, group: TcgcsvGroup): string | null {
  const prefix = /^([A-Za-z]{1,6}[\d.]*[a-z]?)\s*:/.exec(group.name)?.[1];
  for (const code of [group.abbreviation, prefix]) {
    const logo = logos[setCode(code)];
    if (code && logo) return logo;
  }
  return null;
}
