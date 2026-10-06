import type { CollectionItem, CollectionSort } from '@/types/collection';

import { cardVersionPrice, entryVersion } from './cardVersion';
import { type Currency, type MarketPrice, percentChange } from './price';
import { getSealedMarketPrice } from './sealed';

export type CollectionSummary = {
  totalUsd: number;
  totalAtAddUsd: number;
  comparableNowUsd: number;
  paidUsd: number;
  paidNowUsd: number;
  paidItems: number;
  itemCount: number;
  cardCount: number;
  sealedCount: number;
  unpricedCount: number;
};

export type ItemProfit = {
  amount: number;
  percent: number | null;
  currency: Currency;
};

export function itemPrice(item: CollectionItem): MarketPrice | null {
  if (item.kind === 'card' && item.grading?.value) {
    return { amount: item.grading.value, currency: 'USD', source: 'graded', basis: 'market' };
  }
  return item.kind === 'card' ? cardVersionPrice(item.card, entryVersion(item)) : getSealedMarketPrice(item.product);
}

export function ownedCardCounts(items: CollectionItem[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (item.kind === 'card') counts.set(item.card.id, (counts.get(item.card.id) ?? 0) + item.quantity);
  }
  return counts;
}

export function itemValueUsd(item: CollectionItem): number | null {
  const price = itemPrice(item);
  return price?.currency === 'USD' ? price.amount * item.quantity : null;
}

export function itemProfit(item: CollectionItem): ItemProfit | null {
  const price = itemPrice(item);
  if (!price || !item.paid || price.currency !== item.paid.currency) return null;
  return {
    amount: (price.amount - item.paid.amount) * item.quantity,
    percent: percentChange(item.paid.amount, price.amount),
    currency: price.currency,
  };
}

export function summarizeCollection(items: CollectionItem[]): CollectionSummary {
  const summary: CollectionSummary = {
    totalUsd: 0,
    totalAtAddUsd: 0,
    comparableNowUsd: 0,
    paidUsd: 0,
    paidNowUsd: 0,
    paidItems: 0,
    itemCount: 0,
    cardCount: 0,
    sealedCount: 0,
    unpricedCount: 0,
  };

  for (const item of items) {
    summary.itemCount += item.quantity;
    if (item.kind === 'card') summary.cardCount += item.quantity;
    else summary.sealedCount += item.quantity;

    const value = itemValueUsd(item);
    if (value === null) {
      summary.unpricedCount += item.quantity;
      continue;
    }
    summary.totalUsd += value;
    if (item.priceAtAdd?.currency === 'USD') {
      summary.totalAtAddUsd += item.priceAtAdd.amount * item.quantity;
      summary.comparableNowUsd += value;
    }
    if (item.paid?.currency === 'USD') {
      summary.paidUsd += item.paid.amount * item.quantity;
      summary.paidNowUsd += value;
      summary.paidItems += 1;
    }
  }
  return summary;
}

export function itemTitle(item: CollectionItem): string {
  return item.kind === 'card' ? item.card.name : item.product.name;
}

export function sortCollection(items: CollectionItem[], sort: CollectionSort): CollectionItem[] {
  const sorted = [...items];
  if (sort === 'recent') {
    sorted.sort((first, second) => second.lastAddedAt.localeCompare(first.lastAddedAt));
  } else {
    sorted.sort((first, second) => (itemValueUsd(second) ?? -1) - (itemValueUsd(first) ?? -1));
  }
  return sorted;
}
