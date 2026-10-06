import type { Card } from '@/types/card';
import type { PricePoint } from '@/types/collection';
import { dayKey, upsertPoint } from '@/utils/history';

import { readJson, STORAGE_KEYS, writeJson } from './storage';

type Store = Record<string, { seen: string; points: PricePoint[] }>;

const MAX_ITEMS = 400;

let store: Store | null = null;
let loading: Promise<Store> | null = null;

function load(): Promise<Store> {
  if (store) return Promise.resolve(store);
  loading ??= readJson<Store>(STORAGE_KEYS.market).then((value) => {
    store = value && typeof value === 'object' ? value : {};
    return store;
  });
  return loading;
}

export async function recordMarketPrice(id: string, amount: number): Promise<PricePoint[]> {
  const current = await load();
  const today = dayKey(new Date().toISOString());
  const entry = current[id];
  const points = upsertPoint(entry?.points, { date: today, amount, currency: 'USD' });
  current[id] = { seen: today, points };
  const keys = Object.keys(current);
  if (keys.length > MAX_ITEMS) {
    keys
      .sort((first, second) => (current[first]?.seen ?? '').localeCompare(current[second]?.seen ?? ''))
      .slice(0, keys.length - MAX_ITEMS)
      .forEach((key) => delete current[key]);
  }
  writeJson(STORAGE_KEYS.market, current);
  return points;
}

export function estimatedPoints(card: Card, usd: number): PricePoint[] {
  const prices = card.cardmarket?.prices;
  const anchor = prices?.trendPrice ?? prices?.avg1 ?? prices?.avg7 ?? null;
  if (!prices || !anchor || anchor <= 0) return [];
  const ratio = usd / anchor;
  const offsets: [number, number | null | undefined][] = [
    [30, prices.avg30],
    [7, prices.avg7],
    [1, prices.avg1],
  ];
  return offsets.flatMap(([days, value]) => {
    if (!value || value <= 0) return [];
    const date = new Date();
    date.setDate(date.getDate() - days);
    return [{ date: dayKey(date.toISOString()), amount: Math.round(value * ratio * 100) / 100, currency: 'USD' as const }];
  });
}

export function mergePoints(...lists: PricePoint[][]): PricePoint[] {
  const byDate = new Map<string, PricePoint>();
  for (const list of lists) for (const point of list) byDate.set(point.date, point);
  return [...byDate.values()].sort((first, second) => first.date.localeCompare(second.date));
}
