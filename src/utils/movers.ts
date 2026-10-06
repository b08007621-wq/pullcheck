import type { CollectionItem, PricePoint, ValuePoint } from '@/types/collection';

import { itemPrice } from './collectionValue';
import { dayKey } from './history';
import { percentChange } from './price';

export type ChartRange = '7d' | '30d' | '1y' | 'all';

export type Mover = {
  item: CollectionItem;
  amount: number;
  percent: number | null;
};

export const RANGES: { value: ChartRange; label: string }[] = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '1y', label: '1Y' },
  { value: 'all', label: 'All' },
];

const RANGE_DAYS: Record<ChartRange, number> = { '7d': 7, '30d': 30, '1y': 365, all: 36500 };
const MOVER_COUNT = 5;

export function rangeStart(range: ChartRange, now: Date = new Date()): string {
  const start = new Date(now);
  start.setDate(start.getDate() - RANGE_DAYS[range]);
  return dayKey(start.toISOString());
}

export function valuePointsInRange(history: ValuePoint[], range: ChartRange): PricePoint[] {
  const start = rangeStart(range);
  return history
    .filter((point) => point.date >= start)
    .map((point) => ({ date: point.date, amount: point.total, currency: 'USD' }));
}

export function findMovers(items: CollectionItem[], range: ChartRange): { gainers: Mover[]; losers: Mover[] } {
  const start = rangeStart(range);
  const movers: Mover[] = [];
  for (const item of items) {
    const now = itemPrice(item);
    if (!now || now.currency !== 'USD') continue;
    const history = (item.history ?? []).filter((point) => !point.currency || point.currency === 'USD');
    const before = [...history].reverse().find((point) => point.date <= start) ?? history[0];
    if (!before || before.date === dayKey(new Date().toISOString())) continue;
    const amount = (now.amount - before.amount) * item.quantity;
    if (Math.abs(amount) < 0.01) continue;
    movers.push({ item, amount, percent: percentChange(before.amount, now.amount) });
  }
  return {
    gainers: movers
      .filter((mover) => mover.amount > 0)
      .sort((first, second) => second.amount - first.amount)
      .slice(0, MOVER_COUNT),
    losers: movers
      .filter((mover) => mover.amount < 0)
      .sort((first, second) => first.amount - second.amount)
      .slice(0, MOVER_COUNT),
  };
}
