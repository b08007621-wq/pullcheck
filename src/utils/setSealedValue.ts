import type { Game } from '@/types/card';
import type { CollectedSealed, CollectionItem } from '@/types/collection';

import { itemValueUsd } from './collectionValue';

export type SetMatch = {
  game: Game;
  name: string;
  code: string | null;
};

export type SealedValue = {
  value: number;
  count: number;
};

function normalized(text: string): string {
  return text
    .toLowerCase()
    .replace(/é/g, 'e')
    .replace(/[^0-9a-z]+/g, ' ')
    .trim();
}

export function sealedMatchesSet(item: CollectedSealed, set: SetMatch): boolean {
  const product = item.product;
  if ((product.game ?? 'pokemon') !== set.game) return false;
  if (product.market === 'jp') return false;
  if (normalized(product.setName) === normalized(set.name)) return true;
  const code = set.code?.trim().toLowerCase();
  return Boolean(code) && (product.setCode ?? '').trim().toLowerCase() === code;
}

export function setSealedValue(items: CollectionItem[], set: SetMatch): SealedValue {
  let value = 0;
  let count = 0;
  for (const item of items) {
    if (item.kind !== 'sealed' || !sealedMatchesSet(item, set)) continue;
    value += itemValueUsd(item) ?? 0;
    count += item.quantity;
  }
  return { value: Math.round(value * 100) / 100, count };
}

export function sealedSetIndex<T extends { id: string }>(sets: T[], match: (set: T) => SetMatch) {
  const byName = new Map<string, T>();
  const byCode = new Map<string, T>();
  for (const set of sets) {
    const { name, code } = match(set);
    const key = normalized(name);
    if (key && !byName.has(key)) byName.set(key, set);
    const codeKey = code?.trim().toLowerCase();
    if (codeKey && !byCode.has(codeKey)) byCode.set(codeKey, set);
  }
  return (item: CollectedSealed): T | null => {
    const product = item.product;
    if (product.market === 'jp') return null;
    const byTitle = byName.get(normalized(product.setName));
    if (byTitle) return byTitle;
    const codeKey = (product.setCode ?? '').trim().toLowerCase();
    return codeKey ? (byCode.get(codeKey) ?? null) : null;
  };
}
