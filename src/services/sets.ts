import type { SetInfo } from '@/types/set';

import { type CachePolicy, cachedFetch } from './cache';
import { ApiError, getJson, toQueryString } from './http';
import { normalizeText } from './sealedQuery';

type RawSet = {
  id: string;
  name: string;
  series: string;
  releaseDate: string;
  total?: number;
  printedTotal?: number;
  ptcgoCode?: string;
  images: { logo: string; symbol: string };
};

type SetsResponse = {
  data: RawSet[];
  totalCount?: number;
};

const SETS_URL = 'https://api.pokemontcg.io/v2/sets';
const PAGE_SIZE = 250;
const SETS_CACHE: CachePolicy = { bucket: 'sets', ttlMs: 24 * 60 * 60 * 1000, maxEntries: 1 };

export async function loadSets(signal?: AbortSignal): Promise<SetInfo[]> {
  const { value } = await cachedFetch('all-v2', SETS_CACHE, async () => {
    const sets: SetInfo[] = [];
    for (let page = 1; page <= 4; page += 1) {
      const query = toQueryString({
        page,
        pageSize: PAGE_SIZE,
        select: 'id,name,series,releaseDate,total,printedTotal,ptcgoCode,images',
      });
      const response = await getJson<SetsResponse>(`${SETS_URL}?${query}`, { signal, timeoutMs: 12_000 });
      if (!Array.isArray(response.data)) throw new ApiError('badResponse');
      sets.push(...response.data.map(toSetInfo));
      if (response.data.length < PAGE_SIZE || sets.length >= (response.totalCount ?? 0)) break;
    }
    return sets;
  });
  return value;
}

export function findSet(sets: SetInfo[], setName: string): SetInfo | null {
  const target = normalizeText(setName);
  if (!target) return null;
  return (
    sets.find((set) => normalizeText(set.name) === target) ??
    sets
      .filter((set) => target.endsWith(` ${normalizeText(set.name)}`))
      .sort((first, second) => second.name.length - first.name.length)[0] ??
    null
  );
}

function toSetInfo(set: RawSet): SetInfo {
  const total = set.total ?? set.printedTotal ?? 0;
  return {
    id: set.id,
    name: set.name,
    series: set.series,
    releaseDate: set.releaseDate,
    total,
    printedTotal: set.printedTotal && set.printedTotal > 0 ? set.printedTotal : total,
    ptcgoCode: set.ptcgoCode ?? null,
    logo: set.images.logo,
    symbol: set.images.symbol,
  };
}
