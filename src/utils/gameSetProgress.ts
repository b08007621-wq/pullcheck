import type { CollectionItem } from '@/types/collection';

import { itemValueUsd } from './collectionValue';

export type GameSetProgress = {
  owned: number;
  value: number;
};

export function gameSetProgress(items: CollectionItem[]): Map<string, GameSetProgress> {
  const ids = new Map<string, Set<string>>();
  const values = new Map<string, number>();
  for (const item of items) {
    if (item.kind !== 'card') continue;
    const setId = item.card.set.id;
    const owned = ids.get(setId) ?? new Set<string>();
    owned.add(item.card.id);
    ids.set(setId, owned);
    values.set(setId, (values.get(setId) ?? 0) + (itemValueUsd(item) ?? 0));
  }
  return new Map([...ids].map(([setId, owned]) => [setId, { owned: owned.size, value: values.get(setId) ?? 0 }]));
}
