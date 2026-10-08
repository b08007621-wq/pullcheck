import type { CollectionItem } from '@/types/collection';
import type { GameSet } from '@/types/gameSet';

import { itemValueUsd } from './collectionValue';
import { sealedSetIndex } from './setSealedValue';

export type GameSetProgress = {
  owned: number;
  value: number;
};

export function gameSetProgress(items: CollectionItem[], sets: GameSet[] = []): Map<string, GameSetProgress> {
  const ids = new Map<string, Set<string>>();
  const values = new Map<string, number>();
  const sealedSet = sealedSetIndex(sets, (set) => ({ game: set.game, name: set.name, code: set.code }));
  for (const item of items) {
    if (item.kind === 'sealed') {
      const set = item.product.game ? sealedSet(item) : null;
      if (!set || set.game !== item.product.game) continue;
      values.set(set.id, (values.get(set.id) ?? 0) + (itemValueUsd(item) ?? 0));
      if (!ids.has(set.id)) ids.set(set.id, new Set());
      continue;
    }
    const setId = item.card.set.id;
    const owned = ids.get(setId) ?? new Set<string>();
    owned.add(item.card.id);
    ids.set(setId, owned);
    values.set(setId, (values.get(setId) ?? 0) + (itemValueUsd(item) ?? 0));
  }
  return new Map([...ids].map(([setId, owned]) => [setId, { owned: owned.size, value: values.get(setId) ?? 0 }]));
}
