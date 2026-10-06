import type { ChangeBasis, CollectionItem } from '@/types/collection';

import { itemPrice } from './collectionValue';
import { dayKey } from './history';
import { percentChange } from './price';

export type ResolvedBasis = Exclude<ChangeBasis, 'auto'>;

export type ItemChange = {
  percent: number | null;
  amount: number;
  basis: ResolvedBasis;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS: Record<'day' | 'week' | 'month', number> = { day: 1, week: 7, month: 30 };

export const CHANGE_BASIS_OPTIONS: { value: ChangeBasis; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'day', label: '24h' },
  { value: 'week', label: '7d' },
  { value: 'month', label: '30d' },
  { value: 'added', label: 'Added' },
  { value: 'paid', label: 'Paid' },
];

export const CHANGE_CAPTION: Record<ResolvedBasis, string> = {
  added: 'since added',
  paid: 'vs paid',
  day: '24h',
  week: '7d',
  month: '30d',
};

export function itemChange(item: CollectionItem, basis: ChangeBasis): ItemChange | null {
  const now = itemPrice(item);
  if (!now) return null;
  const graded = item.kind === 'card' && Boolean(item.grading?.value);
  const resolved: ResolvedBasis =
    basis === 'auto' || graded ? (item.paid && item.paid.currency === now.currency ? 'paid' : 'added') : basis;
  if (graded && resolved !== 'paid') return null;
  let before: number | null = null;
  if (resolved === 'paid') before = item.paid && item.paid.currency === now.currency ? item.paid.amount : null;
  else if (resolved === 'added') {
    before = item.priceAtAdd && item.priceAtAdd.currency === now.currency ? item.priceAtAdd.amount : null;
  } else before = historyBefore(item, now.currency, DAYS[resolved]);
  if (before === null || before <= 0) return null;
  return { percent: percentChange(before, now.amount), amount: (now.amount - before) * item.quantity, basis: resolved };
}

function historyBefore(item: CollectionItem, currency: string, days: number): number | null {
  const today = dayKey(new Date().toISOString());
  const cutoff = dayKey(new Date(Date.now() - days * DAY_MS).toISOString());
  const points = (item.history ?? []).filter((point) => !point.currency || point.currency === currency);
  const before = [...points].reverse().find((point) => point.date <= cutoff);
  if (before) return before.amount;
  const first = points[0];
  return first && first.date < today ? first.amount : null;
}
