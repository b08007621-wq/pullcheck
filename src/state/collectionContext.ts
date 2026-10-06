import { createContext } from 'react';

import type { Card } from '@/types/card';
import type { CollectionItem, CollectionMeta, PaidPrice } from '@/types/collection';
import type { SealedProduct } from '@/types/sealed';
import type { CardVersion } from '@/utils/cardVersion';

import type { CardEntry } from './collectionReducer';

export type CollectionContextValue = {
  items: CollectionItem[];
  meta: CollectionMeta;
  isLoaded: boolean;
  refreshing: boolean;
  refreshFailed: boolean;
  addCard: (card: Card, version: CardVersion) => void;
  addCards: (entries: CardEntry[]) => void;
  addSealed: (product: SealedProduct) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  refreshCard: (card: Card) => void;
  refreshSealed: (product: SealedProduct) => void;
  refreshPrices: (force: boolean) => Promise<void>;
  setPaid: (key: string, paid: PaidPrice | null) => void;
};

export const CollectionContext = createContext<CollectionContextValue>({
  items: [],
  meta: { lastRefreshAt: null, pricesAsOf: null, valueHistory: [] },
  isLoaded: false,
  refreshing: false,
  refreshFailed: false,
  addCard: () => {},
  addCards: () => {},
  addSealed: () => {},
  setQuantity: () => {},
  remove: () => {},
  refreshCard: () => {},
  refreshSealed: () => {},
  refreshPrices: async () => {},
  setPaid: () => {},
});

export function cardKey(id: string, version: CardVersion): string {
  return `card:${id}|${version.variant ?? '-'}|${version.condition}`;
}

export function sealedKey(productId: number): string {
  return `sealed:${productId}`;
}
