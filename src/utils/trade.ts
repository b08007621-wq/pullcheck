import type { Card } from '@/types/card';
import type { CollectionItem } from '@/types/collection';

import { itemPrice, itemTitle } from './collectionValue';
import { getMarketPrice } from './price';

export type TradeSide = 'give' | 'get';

export type TradeLine = {
  key: string;
  title: string;
  subtitle: string;
  image: string | null;
  unit: number | null;
  quantity: number;
  max: number | null;
};

export type TradeTotals = {
  totalUsd: number;
  unpriced: number;
};

export type TradeVerdict = {
  difference: number;
  label: string;
  tone: 'even' | 'gain' | 'loss';
};

const EVEN_THRESHOLD = 0.01;

export function lineFromCard(card: Card): TradeLine {
  const price = getMarketPrice(card);
  return {
    key: `card:${card.id}`,
    title: card.name,
    subtitle: `${card.set.name} · #${card.number}`,
    image: card.images.small,
    unit: price?.currency === 'USD' ? price.amount : null,
    quantity: 1,
    max: null,
  };
}

export function lineFromItem(item: CollectionItem): TradeLine {
  const price = itemPrice(item);
  return {
    key: item.key,
    title: itemTitle(item),
    subtitle: item.kind === 'card' ? item.card.set.name : item.product.setName,
    image: item.kind === 'card' ? item.card.images.small : item.product.imageUrl,
    unit: price?.currency === 'USD' ? price.amount : null,
    quantity: 1,
    max: item.quantity,
  };
}

export function addLine(lines: TradeLine[], line: TradeLine): TradeLine[] {
  const existing = lines.find((entry) => entry.key === line.key);
  if (!existing) return [...lines, line];
  return lines.map((entry) =>
    entry.key === line.key
      ? { ...entry, quantity: entry.max === null ? entry.quantity + 1 : Math.min(entry.max, entry.quantity + 1) }
      : entry,
  );
}

export function setLineQuantity(lines: TradeLine[], key: string, quantity: number): TradeLine[] {
  if (quantity <= 0) return lines.filter((entry) => entry.key !== key);
  return lines.map((entry) =>
    entry.key === key ? { ...entry, quantity: entry.max === null ? quantity : Math.min(entry.max, quantity) } : entry,
  );
}

export function tradeTotals(lines: TradeLine[]): TradeTotals {
  let totalUsd = 0;
  let unpriced = 0;
  for (const line of lines) {
    if (line.unit === null) unpriced += line.quantity;
    else totalUsd += line.unit * line.quantity;
  }
  return { totalUsd, unpriced };
}

export function tradeVerdict(give: TradeTotals, get: TradeTotals): TradeVerdict {
  const difference = Math.round((get.totalUsd - give.totalUsd) * 100) / 100;
  if (Math.abs(difference) < EVEN_THRESHOLD) return { difference: 0, label: 'Even trade', tone: 'even' };
  if (difference > 0) return { difference, label: 'You come out ahead', tone: 'gain' };
  return { difference, label: 'You give up more', tone: 'loss' };
}
