import type { Card } from '@/types/card';
import type { CollectedCard, CollectedSealed, CollectionItem, CollectionMeta, PaidPrice } from '@/types/collection';
import type { SealedProduct } from '@/types/sealed';
import { type CardVersion, cardVersionPrice, resolveVersion } from '@/utils/cardVersion';
import { itemPrice, summarizeCollection } from '@/utils/collectionValue';
import { isCondition } from '@/utils/condition';
import { dayKey, upsertPoint } from '@/utils/history';
import { defaultVariant, type MarketPrice } from '@/utils/price';
import { getSealedMarketPrice } from '@/utils/sealed';

import { cardKey, sealedKey } from './collectionContext';

export type CardEntry = {
  card: Card;
  version: CardVersion;
};

export type CollectionState = {
  items: CollectionItem[];
  meta: CollectionMeta;
  isLoaded: boolean;
};

export type CollectionAction =
  | { type: 'hydrate'; items: CollectionItem[]; meta: CollectionMeta }
  | { type: 'addCard'; card: Card; version: CardVersion; at: string }
  | { type: 'addCards'; entries: CardEntry[]; at: string }
  | { type: 'addSealed'; product: SealedProduct; at: string }
  | { type: 'setQuantity'; key: string; quantity: number; at: string }
  | { type: 'remove'; key: string; at: string }
  | { type: 'refreshCard'; card: Card; at: string }
  | { type: 'refreshSealed'; product: SealedProduct; at: string }
  | { type: 'applyRefresh'; cards: Card[]; products: SealedProduct[]; pricesAsOf: string | null; at: string }
  | { type: 'setPaid'; key: string; paid: PaidPrice | null };

export const EMPTY_META: CollectionMeta = { lastRefreshAt: null, pricesAsOf: null, valueHistory: [] };

export const INITIAL_COLLECTION: CollectionState = { items: [], meta: EMPTY_META, isLoaded: false };

export function collectionReducer(state: CollectionState, action: CollectionAction): CollectionState {
  switch (action.type) {
    case 'hydrate':
      return { items: normalizeCards(action.items), meta: action.meta, isLoaded: true };
    case 'addCard':
      return withValue(state, addCardEntry(state.items, action, action.at), action.at);
    case 'addCards':
      return withValue(
        state,
        action.entries.reduce((items, entry) => addCardEntry(items, entry, action.at), state.items),
        action.at,
      );
    case 'addSealed':
      return withValue(state, add(state.items, sealedKey(action.product.productId), (existing) =>
        existing?.kind === 'sealed'
          ? { ...existing, product: action.product, quantity: existing.quantity + 1, lastAddedAt: action.at }
          : newItem(
              { kind: 'sealed', key: sealedKey(action.product.productId), product: action.product },
              getSealedMarketPrice(action.product),
              action.at,
            ),
      ), action.at);
    case 'setQuantity':
      return withValue(
        state,
        action.quantity <= 0
          ? state.items.filter((item) => item.key !== action.key)
          : state.items.map((item) => (item.key === action.key ? { ...item, quantity: action.quantity } : item)),
        action.at,
      );
    case 'remove':
      return withValue(state, state.items.filter((item) => item.key !== action.key), action.at);
    case 'refreshCard':
      return withValue(state, refreshItems(state.items, [action.card], [], action.at), action.at);
    case 'refreshSealed':
      return withValue(state, refreshItems(state.items, [], [action.product], action.at), action.at);
    case 'applyRefresh': {
      const updated = withValue(state, refreshItems(state.items, action.cards, action.products, action.at), action.at);
      return {
        ...updated,
        meta: { ...updated.meta, lastRefreshAt: action.at, pricesAsOf: action.pricesAsOf ?? updated.meta.pricesAsOf ?? null },
      };
    }
    case 'setPaid':
      return {
        ...state,
        items: state.items.map((item) => (item.key === action.key ? { ...item, paid: action.paid } : item)),
      };
  }
}

function addCardEntry(items: CollectionItem[], entry: CardEntry, at: string): CollectionItem[] {
  const version = resolveVersion(entry.card, entry.version);
  const key = cardKey(entry.card.id, version);
  return add(items, key, (existing) =>
    existing?.kind === 'card'
      ? { ...existing, card: entry.card, quantity: existing.quantity + 1, lastAddedAt: at }
      : newItem(
          { kind: 'card', key, card: entry.card, variant: version.variant, condition: version.condition },
          cardVersionPrice(entry.card, version),
          at,
        ),
  );
}

type NewItemBase =
  | Pick<CollectedCard, 'kind' | 'key' | 'card' | 'variant' | 'condition'>
  | Pick<CollectedSealed, 'kind' | 'key' | 'product'>;

function newItem(base: NewItemBase, price: MarketPrice | null, at: string): CollectionItem {
  return {
    ...base,
    quantity: 1,
    addedAt: at,
    lastAddedAt: at,
    priceAtAdd: price,
    history: price ? [{ date: dayKey(at), amount: price.amount, currency: price.currency }] : [],
  } as CollectionItem;
}

function add(
  items: CollectionItem[],
  key: string,
  build: (existing: CollectionItem | undefined) => CollectionItem,
): CollectionItem[] {
  const existing = items.find((item) => item.key === key);
  const next = build(existing);
  return existing ? items.map((item) => (item.key === key ? next : item)) : [next, ...items];
}

function refreshItems(items: CollectionItem[], cards: Card[], products: SealedProduct[], at: string): CollectionItem[] {
  if (cards.length === 0 && products.length === 0) return items;
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const productById = new Map(products.map((product) => [product.productId, product]));

  return normalizeCards(items.map((item) => {
    let next: CollectionItem = item;
    if (item.kind === 'card') {
      const card = cardById.get(item.card.id);
      if (card) next = { ...item, card };
    } else {
      const product = productById.get(item.product.productId);
      if (product) next = { ...item, product };
    }
    if (next === item) return item;
    const price = itemPrice(next);
    if (!price) return next;
    const point = { date: dayKey(at), amount: price.amount, currency: price.currency };
    const previous = next.history?.[next.history.length - 1];
    const sameCurrency = !previous?.currency || previous.currency === price.currency;
    return { ...next, history: sameCurrency ? upsertPoint(next.history, point) : [point] };
  }));
}

function normalizeCards(items: CollectionItem[]): CollectionItem[] {
  let changed = false;
  const byKey = new Map<string, CollectionItem>();
  for (const item of items) {
    let next = item;
    if (item.kind === 'card') {
      const version: CardVersion = {
        variant: item.variant ?? defaultVariant(item.card),
        condition: isCondition(item.condition) ? item.condition : 'NM',
      };
      const key = cardKey(item.card.id, version);
      if (key !== item.key || item.variant !== version.variant || item.condition !== version.condition) {
        next = { ...item, key, variant: version.variant, condition: version.condition };
        changed = true;
      }
    }
    const existing = byKey.get(next.key);
    if (existing) changed = true;
    byKey.set(next.key, existing ? mergeEntries(existing, next) : next);
  }
  return changed ? [...byKey.values()] : items;
}

function mergeEntries(first: CollectionItem, second: CollectionItem): CollectionItem {
  return {
    ...first,
    quantity: first.quantity + second.quantity,
    addedAt: first.addedAt < second.addedAt ? first.addedAt : second.addedAt,
    lastAddedAt: first.lastAddedAt > second.lastAddedAt ? first.lastAddedAt : second.lastAddedAt,
    priceAtAdd: first.priceAtAdd ?? second.priceAtAdd,
    paid: first.paid ?? second.paid,
    history: (first.history?.length ?? 0) >= (second.history?.length ?? 0) ? first.history : second.history,
  };
}

function withValue(state: CollectionState, items: CollectionItem[], at: string): CollectionState {
  const total = Math.round(summarizeCollection(items).totalUsd * 100) / 100;
  const valueHistory =
    total > 0 ? upsertPoint(state.meta.valueHistory, { date: dayKey(at), total }) : state.meta.valueHistory;
  return { ...state, items, meta: { ...state.meta, valueHistory } };
}
