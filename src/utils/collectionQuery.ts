import { normalizeText } from '@/services/sealedQuery';
import type { Game } from '@/types/card';
import type {
  BinderFilter,
  ChangeBasis,
  CollectionFilter,
  CollectionItem,
  CollectionSort,
  QuickFilter,
} from '@/types/collection';

import { itemBinder } from './binder';
import { entryVersion, versionLabel } from './cardVersion';
import { itemChange } from './collectionChange';
import { itemPrice, itemTitle, itemValueUsd } from './collectionValue';
import { gameOf } from './game';
import { marketGame } from './market';

export type CollectionQuery = {
  text: string;
  type: CollectionFilter;
  binder: BinderFilter;
  quick: QuickFilter | null;
  set: string | null;
  game: Game | 'all';
  sort: CollectionSort;
  basis: ChangeBasis;
};

export const SORT_OPTIONS: { value: CollectionSort; label: string; icon: string }[] = [
  { value: 'value', label: 'Highest value', icon: 'cash-outline' },
  { value: 'recent', label: 'Recently added', icon: 'time-outline' },
  { value: 'gain', label: 'Biggest gains', icon: 'trending-up' },
  { value: 'drop', label: 'Biggest drops', icon: 'trending-down' },
  { value: 'name', label: 'Name', icon: 'text-outline' },
  { value: 'set', label: 'Set', icon: 'albums-outline' },
];

export const QUICK_FILTERS: { value: QuickFilter; label: string }[] = [
  { value: 'new', label: 'Added this week' },
  { value: 'dupes', label: 'Extra copies' },
  { value: 'gainers', label: 'Going up' },
  { value: 'losers', label: 'Going down' },
  { value: 'graded', label: 'Graded' },
  { value: 'unpriced', label: 'No price' },
];

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function itemSetName(item: CollectionItem): string {
  return item.kind === 'card' ? item.card.set.name : item.product.setName;
}

export function setCounts(items: CollectionItem[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const name = itemSetName(item);
    if (name) counts.set(name, (counts.get(name) ?? 0) + item.quantity);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((first, second) => second.count - first.count || first.name.localeCompare(second.name));
}

export function itemGame(item: CollectionItem): Game {
  return item.kind === 'card' ? gameOf(item.card) : marketGame(item.product.market);
}

export type GameTotal = {
  game: Game;
  count: number;
  value: number;
};

export function gameTotals(items: CollectionItem[]): GameTotal[] {
  const totals = new Map<Game, GameTotal>();
  for (const item of items) {
    const game = itemGame(item);
    const total = totals.get(game) ?? { game, count: 0, value: 0 };
    total.count += item.quantity;
    total.value += itemValueUsd(item) ?? 0;
    totals.set(game, total);
  }
  return [...totals.values()].sort((first, second) => second.value - first.value || second.count - first.count);
}

export function isNewItem(item: CollectionItem, now = Date.now()): boolean {
  return now - Date.parse(item.addedAt) < WEEK_MS;
}

export function showsNewTag(item: CollectionItem, fresh = false): boolean {
  if (!fresh && !isNewItem(item)) return false;
  return !item.seenAt || item.seenAt < item.lastAddedAt;
}

export function queryCollection(items: CollectionItem[], query: CollectionQuery, usesBinders: boolean): CollectionItem[] {
  const words = normalizeText(query.text).split(' ').filter(Boolean);
  const now = Date.now();
  const kept = items.filter((item) => {
    if (query.type !== 'all' && item.kind !== query.type) return false;
    if (usesBinders && query.binder !== 'all' && itemBinder(item) !== query.binder) return false;
    if (query.set && itemSetName(item) !== query.set) return false;
    if (query.game !== 'all' && itemGame(item) !== query.game) return false;
    if (query.quick && !matchesQuick(item, query.quick, query.basis, now)) return false;
    if (words.length > 0) {
      const haystack = normalizeText(searchText(item));
      if (!words.every((word) => haystack.includes(word))) return false;
    }
    return true;
  });
  return sortItems(kept, query.sort, query.basis);
}

function matchesQuick(item: CollectionItem, quick: QuickFilter, basis: ChangeBasis, now: number): boolean {
  switch (quick) {
    case 'dupes':
      return item.quantity >= 2;
    case 'graded':
      return item.kind === 'card' && Boolean(item.grading);
    case 'new':
      return isNewItem(item, now);
    case 'unpriced':
      return itemPrice(item) === null;
    case 'gainers':
      return (itemChange(item, basis)?.amount ?? 0) > 0.004;
    case 'losers':
      return (itemChange(item, basis)?.amount ?? 0) < -0.004;
  }
}

function searchText(item: CollectionItem): string {
  if (item.kind === 'sealed') return `${item.product.name} ${item.product.setName}`;
  const version = versionLabel(item.card, entryVersion(item)) ?? '';
  return `${item.card.name} ${item.card.set.name} ${item.card.number} ${item.card.rarity ?? ''} ${version}`;
}

function sortItems(items: CollectionItem[], sort: CollectionSort, basis: ChangeBasis): CollectionItem[] {
  const sorted = [...items];
  const percent = (item: CollectionItem) => itemChange(item, basis)?.percent ?? null;
  switch (sort) {
    case 'recent':
      return sorted.sort((first, second) => second.lastAddedAt.localeCompare(first.lastAddedAt));
    case 'name':
      return sorted.sort((first, second) => itemTitle(first).localeCompare(itemTitle(second)));
    case 'set':
      return sorted.sort(
        (first, second) =>
          itemSetName(first).localeCompare(itemSetName(second)) || collectorOrder(first) - collectorOrder(second),
      );
    case 'gain':
      return sorted.sort((first, second) => (percent(second) ?? -Infinity) - (percent(first) ?? -Infinity));
    case 'drop':
      return sorted.sort((first, second) => (percent(first) ?? Infinity) - (percent(second) ?? Infinity));
    default:
      return sorted.sort((first, second) => (itemValueUsd(second) ?? -1) - (itemValueUsd(first) ?? -1));
  }
}

function collectorOrder(item: CollectionItem): number {
  if (item.kind !== 'card') return Number.MAX_SAFE_INTEGER;
  const number = Number.parseInt(item.card.number.replace(/\D+/g, ''), 10);
  return Number.isFinite(number) ? number : Number.MAX_SAFE_INTEGER;
}

export type CollectionStats = {
  unique: number;
  extraCopies: number;
  graded: number;
  addedThisWeek: number;
  top: CollectionItem | null;
};

export function collectionStats(items: CollectionItem[]): CollectionStats {
  const now = Date.now();
  let top: CollectionItem | null = null;
  let topValue = -1;
  const stats: CollectionStats = { unique: 0, extraCopies: 0, graded: 0, addedThisWeek: 0, top: null };
  for (const item of items) {
    stats.unique += 1;
    stats.extraCopies += Math.max(0, item.quantity - 1);
    if (item.kind === 'card' && item.grading) stats.graded += 1;
    if (isNewItem(item, now)) stats.addedThisWeek += 1;
    const price = itemPrice(item);
    if (price && price.currency === 'USD' && price.amount > topValue) {
      topValue = price.amount;
      top = item;
    }
  }
  stats.top = top;
  return stats;
}

export function collectionCsv(items: CollectionItem[]): string {
  const rows = [['Name', 'Set', 'Number', 'Type', 'Version', 'Condition', 'Quantity', 'Price', 'Currency', 'Paid', 'Binder', 'Added']];
  for (const item of items) {
    const price = itemPrice(item);
    rows.push([
      itemTitle(item),
      itemSetName(item),
      item.kind === 'card' ? item.card.number : (item.product.cardNumber ?? ''),
      item.kind === 'card' ? 'Card' : 'Sealed',
      item.kind === 'card' ? (versionLabel(item.card, entryVersion(item)) ?? '') : '',
      item.kind === 'card' ? (item.condition ?? 'NM') : '',
      String(item.quantity),
      price ? price.amount.toFixed(2) : '',
      price?.currency ?? '',
      item.paid ? item.paid.amount.toFixed(2) : '',
      itemBinder(item),
      item.addedAt.slice(0, 10),
    ]);
  }
  return rows.map((row) => row.map(csvCell).join(',')).join('\n');
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
