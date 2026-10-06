import type { Card } from '@/types/card';
import type { CollectionItem } from '@/types/collection';
import type { SetFilter, SetInfo, SetMode } from '@/types/set';

import { cardVersionPrice } from './cardVersion';
import { itemValueUsd } from './collectionValue';
import { defaultVariant, getMarketPrice, getVariantOptions } from './price';

export type OwnedIndex = Map<string, Map<string, number>>;

export type VariantSlot = {
  variant: string | null;
  owned: number;
  price: number | null;
};

export type SetEntry = {
  card: Card;
  slots: VariantSlot[];
  copies: number;
  complete: boolean;
  started: boolean;
};

export type SetStats = {
  owned: number;
  total: number;
  percent: number;
  missingCost: number;
  missingUnpriced: number;
};

export type SetListProgress = {
  owned: number;
  total: number;
  percent: number;
  value: number;
};

const NO_VARIANT = '-';

const VARIANT_PIP: Record<string, string> = {
  normal: 'N',
  holofoil: 'H',
  reverseHolofoil: 'R',
  '1stEditionHolofoil': '1H',
  '1stEditionNormal': '1N',
  '1stEdition': '1E',
  unlimitedHolofoil: 'UH',
  unlimited: 'U',
};

export function buildOwnedIndex(items: CollectionItem[]): OwnedIndex {
  const index: OwnedIndex = new Map();
  for (const item of items) {
    if (item.kind !== 'card') continue;
    const variants = index.get(item.card.id) ?? new Map<string, number>();
    const key = item.variant ?? NO_VARIANT;
    variants.set(key, (variants.get(key) ?? 0) + item.quantity);
    index.set(item.card.id, variants);
  }
  return index;
}

export function collectorNumber(card: Card): number | null {
  const printed = card.number.split('/')[0]?.trim() ?? '';
  return /^\d+$/.test(printed) ? Number.parseInt(printed, 10) : null;
}

export function isBaseCard(card: Card, printedTotal: number): boolean {
  const number = collectorNumber(card);
  return number !== null && number <= printedTotal;
}

export function compareByNumber(first: Card, second: Card): number {
  const a = collectorNumber(first);
  const b = collectorNumber(second);
  if (a !== null && b !== null) return a - b;
  if (a !== null) return -1;
  if (b !== null) return 1;
  return first.number.localeCompare(second.number, 'en', { numeric: true });
}

export function variantPip(variant: string | null): string {
  if (!variant) return '•';
  return VARIANT_PIP[variant] ?? variant.charAt(0).toUpperCase();
}

export function buildSetEntries(cards: Card[], set: SetInfo, mode: SetMode, index: OwnedIndex): SetEntry[] {
  return cards
    .filter((card) => mode === 'master' || isBaseCard(card, set.printedTotal))
    .sort(compareByNumber)
    .map((card) => {
      const owned = index.get(card.id);
      const copies = owned ? [...owned.values()].reduce((sum, count) => sum + count, 0) : 0;
      const slots = mode === 'master' ? masterSlots(card, owned) : [{ variant: null, owned: copies, price: cheapestPrice(card) }];
      const ownedSlots = slots.filter((slot) => slot.owned > 0).length;
      return { card, slots, copies, complete: ownedSlots === slots.length, started: ownedSlots > 0 };
    });
}

export function summarizeSet(entries: SetEntry[]): SetStats {
  let owned = 0;
  let total = 0;
  let missingCost = 0;
  let missingUnpriced = 0;
  for (const entry of entries) {
    for (const slot of entry.slots) {
      total += 1;
      if (slot.owned > 0) owned += 1;
      else if (slot.price === null) missingUnpriced += 1;
      else missingCost += slot.price;
    }
  }
  return {
    owned,
    total,
    percent: total > 0 ? owned / total : 0,
    missingCost: Math.round(missingCost * 100) / 100,
    missingUnpriced,
  };
}

export function filterEntries(entries: SetEntry[], filter: SetFilter): SetEntry[] {
  if (filter === 'owned') return entries.filter((entry) => entry.started);
  if (filter === 'missing') return entries.filter((entry) => !entry.complete);
  return entries;
}

export function setValueUsd(items: CollectionItem[], setId: string): number {
  let value = 0;
  for (const item of items) {
    if (item.kind === 'card' && item.card.set.id === setId) value += itemValueUsd(item) ?? 0;
  }
  return Math.round(value * 100) / 100;
}

export function listProgress(items: CollectionItem[], sets: SetInfo[]): Map<string, SetListProgress> {
  const byId = new Map(sets.map((set) => [set.id, set]));
  const owned = new Map<string, Set<string>>();
  const value = new Map<string, number>();

  for (const item of items) {
    if (item.kind !== 'card') continue;
    const set = byId.get(item.card.set.id);
    if (!set) continue;
    value.set(set.id, (value.get(set.id) ?? 0) + (itemValueUsd(item) ?? 0));
    if (!isBaseCard(item.card, set.printedTotal)) continue;
    const ids = owned.get(set.id) ?? new Set<string>();
    ids.add(item.card.id);
    owned.set(set.id, ids);
  }

  const progress = new Map<string, SetListProgress>();
  for (const [setId, setValue] of value) {
    const set = byId.get(setId);
    if (!set) continue;
    const count = owned.get(setId)?.size ?? 0;
    progress.set(setId, {
      owned: count,
      total: set.printedTotal,
      percent: set.printedTotal > 0 ? Math.min(1, count / set.printedTotal) : 0,
      value: Math.round(setValue * 100) / 100,
    });
  }
  return progress;
}

function masterSlots(card: Card, owned: Map<string, number> | undefined): VariantSlot[] {
  const options = getVariantOptions(card);
  const fallback = owned?.get(NO_VARIANT) ?? 0;
  if (options.length === 0) {
    const copies = owned ? [...owned.values()].reduce((sum, count) => sum + count, 0) : 0;
    return [{ variant: null, owned: copies, price: usd(getMarketPrice(card)) }];
  }
  const primary = defaultVariant(card);
  return options.map((variant) => ({
    variant,
    owned: (owned?.get(variant) ?? 0) + (variant === primary ? fallback : 0),
    price: usd(cardVersionPrice(card, { variant, condition: 'NM' })),
  }));
}

function cheapestPrice(card: Card): number | null {
  const prices = getVariantOptions(card)
    .map((variant) => usd(cardVersionPrice(card, { variant, condition: 'NM' })))
    .filter((price): price is number => price !== null);
  return prices.length > 0 ? Math.min(...prices) : usd(getMarketPrice(card));
}

function usd(price: { amount: number; currency: string } | null): number | null {
  return price?.currency === 'USD' ? price.amount : null;
}
