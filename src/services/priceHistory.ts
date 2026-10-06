import type { Market } from '@/types/sealed';
import type { PricePoint } from '@/types/collection';

import { type CachePolicy, cachedFetch } from './cache';
import { getJson } from './http';

type HistoryFile = {
  start: string;
  series: Record<string, Record<string, [number, number][]>>;
};

const BASE = 'https://cdn.jsdelivr.net/gh/b08007621-wq/pullcheck@price-history';
const HISTORY_CACHE: CachePolicy = { bucket: 'price-history', ttlMs: 12 * 60 * 60 * 1000, maxEntries: 12 };
const DAY_MS = 24 * 60 * 60 * 1000;

export async function loadProductHistory(
  market: Market,
  groupId: number,
  productId: number,
  variant?: string | null,
): Promise<PricePoint[]> {
  const { value } = await cachedFetch(`${market}:${groupId}`, HISTORY_CACHE, () =>
    getJson<HistoryFile>(`${BASE}/${market}/${groupId}.json`, { timeoutMs: 20_000, maxAttempts: 2 }),
  );
  const byVariant = value.series[String(productId)];
  if (!byVariant) return [];
  const key = pickVariant(Object.keys(byVariant), variant);
  const points = key ? byVariant[key] : undefined;
  if (!points) return [];
  const start = Date.parse(`${value.start}T00:00:00Z`);
  return points.map(([offset, amount]) => ({
    date: new Date(start + offset * DAY_MS).toISOString().slice(0, 10),
    amount,
    currency: 'USD',
  }));
}

function pickVariant(keys: string[], variant?: string | null): string | null {
  if (variant && keys.includes(variant)) return variant;
  for (const preferred of ['holofoil', 'normal', '1stEditionHolofoil', 'unlimitedHolofoil']) {
    if (keys.includes(preferred)) return preferred;
  }
  return keys[0] ?? null;
}
